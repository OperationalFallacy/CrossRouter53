
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';
import * as cdk from '@aws-cdk/core';
import { CdkPipeline, CdkStage, SimpleSynthAction } from '@aws-cdk/pipelines';
import { SubdomainStage, DelegationStage } from './app-stages';
import { PipelineProject, BuildSpec, LinuxBuildImage} from '@aws-cdk/aws-codebuild'
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

    const devapp = new SubdomainStage(this, 'CreateDev', {
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

    const prodapp = new SubdomainStage(this, 'CreateProd', {
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

    // {
    //   "artifactFile": {
    //     "artifact": {
    //       "metadata": {},
    //       "_artifactName": "Artifact_Route53PipelineCreateDevSubDomain1Route53Stackdev1838D203_Outputs"
    //     },
    //     "fileName": "outputs.json"
    //   },
    //   "outputName": "ZoneNameServers"
    // }

    const devoutputs = new codepipeline.Artifact(pipeline.stackOutput(devapp.ZoneInfo).artifactFile.artifact.artifactName);
    const prodoutputs = new codepipeline.Artifact(pipeline.stackOutput(prodapp.ZoneInfo).artifactFile.artifact.artifactName);

    // const websitebucket: BuildEnvironmentVariable = { value: pipeline.stackOutput(prodapp.ZoneInfo).artifactFile.artifact.artifactName  };

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
        buildImage: LinuxBuildImage.STANDARD_2_0,
      },
    });
  

    const ReBuildCdkAction = new actions.CodeBuildAction({
      actionName: 'CdkBuild',
      project: CdkBuildProject,
      input: sourceArtifact,
      extraInputs: [ devoutputs, prodoutputs  ], // outputs from deployed stacks
      outputs: [ cloudAssemblyArtifactUpdated ],
    });
    
    const RebuildCdk = pipeline.addStage('RebuildCdk');
    RebuildCdk.addActions(ReBuildCdkAction);

    const UpdateTLDDomain = pipeline.addStage('UpdateTLDDomain');
    const tldapp = new DelegationStage(this, 'Deploy', {
      env: { 
        region: 'us-east-1',
        account: '208334959160' 
      }
    },
    {
      stacksettings: {
        environment: 'root',
      }
    });

    UpdateTLDDomain.addApplication(tldapp)
    // overwrite artifact
    const cfnPipeline = pipeline.codePipeline.node.defaultChild as unknown as CfnPipeline
    // TemplatePath: Artifact_Build_Synth::assembly-Route53-Pipeline-UpdateTLDDomain/Route53PipelineUpdateTLDDomainRoute53Stackroot8CA1E97B.template.json
    // 
    console.log(cfnPipeline)
    cfnPipeline.addPropertyOverride(`Stages.5.Actions.0.Configuration.TemplatePath`,`Artifact_RebuildCdk_CdkBuild::`+ [ tldapp.artifactId, tldapp.TemplateFile].join('/'))
  //  cfnPipeline.addPropertyOverride(`Stages.4.Actions.1.Configuration.InputArtifacts.Name`,`Artifact_ExtractNameserver_CdkBuild`)
  }
}
