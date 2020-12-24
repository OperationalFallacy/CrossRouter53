
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';
import * as cdk from '@aws-cdk/core';
import { CdkPipeline, CdkStage, ShellScriptAction, SimpleSynthAction } from '@aws-cdk/pipelines';
import { PipelineStage } from './app-stage';

export interface PipelineStackProps extends cdk.StackProps {
  name: string;
}

export class PipelineStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const sourceArtifact = new codepipeline.Artifact();
    const cloudAssemblyArtifact = new codepipeline.Artifact();

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
    const CreateSubDomains = pipeline.addStage('CreateSubDomains');

    const devapp = new PipelineStage(this, 'CreateDevSubDomain', {
      env: { 
        region: 'us-east-1',
        account: '164411640669' 
      }
    },
    {
      stacksettings: {
        environment: 'dev',
        hostedZone: undefined
      }
    });

    const prodapp = new PipelineStage(this, 'CreateProdSubDomain', {
      env: { 
        region: 'us-east-1',
        account: '116907314417' 
      }
    },
    {
      stacksettings: {
        environment: 'prod',
        hostedZone: undefined
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

    const comboAction = new ShellScriptAction({
      actionName: 'TestInfra',
      useOutputs: {
        // Get the stack Output from the Stage and make it available in
        // the shell script as $ZoneInfo
        DEV_ZONE_INFO: pipeline.stackOutput(devapp.ZoneInfo),
        PROD_ZONE_INFO: pipeline.stackOutput(prodapp.ZoneInfo)
      },
      commands: [
        'ls -alR',
        'env',
        'echo $DEV_ZONE_INFO $PROD_ZONE_INFO'
      ]
    })

    CreateSubDomains.addActions(comboAction);
    
    pipeline.addApplicationStage(new PipelineStage(this, 'UpdateTLDZoneDelegation', {
      env: { 
        region: 'us-east-1',
        account: '208334959160'
      }
    },
    {
      stacksettings: {
        environment: 'root',
        hostedZone: pipeline.stackOutput(devapp.ZoneInfo).outputName.toString()
      }
    }));

  }
}
