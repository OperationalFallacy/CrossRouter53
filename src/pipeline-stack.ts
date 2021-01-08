
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';
import * as cdk from '@aws-cdk/core';
import { CdkPipeline, CdkStage, SimpleSynthAction } from '@aws-cdk/pipelines';
import { SubdomainStage, DelegationStage } from './app-stages';
import { PipelineProject, BuildSpec, LinuxBuildImage, BuildEnvironmentVariableType} from '@aws-cdk/aws-codebuild'
import { CfnPipeline } from '@aws-cdk/aws-datapipeline'

export interface PipelineStackProps extends cdk.StackProps {
  name: string;
}

export class PipelineStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);
    
    const sourceArtifact = new codepipeline.Artifact();
    const cloudAssemblyArtifact = new codepipeline.Artifact();
    const cloudAssemblyArtifactUpdated = new codepipeline.Artifact();

    const pipeline = new CdkPipeline(this, 'Pipeline', {
      pipelineName: `${props.name}-DeliveryPipeline`,
      cloudAssemblyArtifact,
      sourceAction: new actions.GitHubSourceAction({
        actionName: 'GitHub',
        output: sourceArtifact,
        oauthToken: cdk.SecretValue.secretsManager('github-token-new'),
        trigger: actions.GitHubTrigger.WEBHOOK,
        owner: 'OperationalFallacy',
        repo: 'CrossRouter53',
        branch: 'delegated_zone',
      }),

      synthAction: SimpleSynthAction.standardYarnSynth({
        sourceArtifact,
        cloudAssemblyArtifact,
        environment: {
          privileged: true, // so that we can use Docker bundling
        }
      })
    })

    // This is where we add the application stages - it should be branch-based perhaps
    const CreateSubDomains = pipeline.addStage('SubDomains');

    const devapp = new SubdomainStage(this, 'Dev', {
      env: { 
        region: 'us-east-1',
        account: '164411640669' 
      }
    },
    {
      stacksettings: {
        environment: 'dev'
      }
    });

    const prodapp = new SubdomainStage(this, 'Prod', {
      env: { 
        region: 'us-east-1',
        account: '116907314417' 
      }
    },
    {
      stacksettings: {
        environment: 'prod'
      }
    });
    
    function RunNextActionInParallel(s: CdkStage) {
      let currentRunOrder = s.nextSequentialRunOrder(0)
      s.nextSequentialRunOrder(1-currentRunOrder)
    }

    CreateSubDomains.addApplication(devapp);
    RunNextActionInParallel(CreateSubDomains);
    CreateSubDomains.addApplication(prodapp);
    RunNextActionInParallel(CreateSubDomains);

    // const devoutputs = new codepipeline.Artifact(pipeline.stackOutput(devapp.ZoneInfo).artifactFile.artifact.artifactName);
    // const prodoutputs = new codepipeline.Artifact(pipeline.stackOutput(prodapp.ZoneInfo).artifactFile.artifact.artifactName);

    // this is used in stage
    const CdkBuildProject = new PipelineProject(this, 'CombineOutputs', {
      
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'yarn install --frozen-lockfile'
            ],
          },
          build: {
            commands: [
              'ls -al',
              'env',
              'npx cdk synth'
            ]
          },
        },
        artifacts: {
          'base-directory': 'cdk.out',
          files: [
            '**/*',
          ],
        },
      }),
      environment: {
        buildImage: LinuxBuildImage.STANDARD_4_0,
      },
    });
  
    const defaultEnvVariables = {
      DNS_DEV: { type: BuildEnvironmentVariableType.PLAINTEXT, value: "#{" + [`DNS`, devapp.stageName, devapp.account ].join('_') + ".ZoneNameServers}" },
      DNS_PROD: { type: BuildEnvironmentVariableType.PLAINTEXT, value: "#{" + [`DNS`, prodapp.stageName, prodapp.account ].join('_') + ".ZoneNameServers}" },
    };

    const ReBuildCdkAction = new actions.CodeBuildAction({
      actionName: 'CdkBuild',
      project: CdkBuildProject,
      input: sourceArtifact,
      // extraInputs: [ devoutputs, prodoutputs  ], // outputs from deployed stacks if needed, but only 5 allowed
      outputs: [ cloudAssemblyArtifactUpdated ],
      environmentVariables: defaultEnvVariables
    });
    
    const RebuildCdk = pipeline.addStage('RebuildCdk');
    RebuildCdk.addActions(ReBuildCdkAction);

    const UpdateTLDDomain = pipeline.addStage('DeployDelegationForSubdomains');

    // stage named as Update-Tld(DelegationStack)-root(environment)
    const tldapp = new DelegationStage(this, 'Delegation', {
      env: { 
        region: 'us-east-1',
        account: '208334959160' 
      }
    });

    UpdateTLDDomain.addApplication(tldapp, {
      manualApprovals: true
    })

    // overwrite some parts of CF template for properties pipeline package doesn't provide
    const cfnPipeline = pipeline.codePipeline.node.defaultChild as unknown as CfnPipeline

    // Overwrite actions to have var namespace configure
    cfnPipeline.addPropertyOverride(`Stages.3.Actions.1.Namespace`, [`DNS`, devapp.stageName, devapp.account ].join('_'))
    cfnPipeline.addPropertyOverride(`Stages.3.Actions.3.Namespace`, [`DNS`, prodapp.stageName, prodapp.account ].join('_'))
  }
}
