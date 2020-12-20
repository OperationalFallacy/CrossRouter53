
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';
import * as cdk from '@aws-cdk/core';
import { ShellScriptAction, CdkPipeline, SimpleSynthAction } from '@aws-cdk/pipelines';
import { PipelineStage } from './app-stage';
import { PolicyStatement } from "@aws-cdk/aws-iam"

export interface PipelineStackProps extends cdk.StackProps {
  name: string;
}

export class PipelineStack extends cdk.Stack {
  public readonly pipeline: CdkPipeline;

  constructor(scope: cdk.Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const sourceArtifact = new codepipeline.Artifact();
    const cloudAssemblyArtifact = new codepipeline.Artifact();

    this.pipeline = new CdkPipeline(this, 'Pipeline', {
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
    const devstage = new PipelineStage(this, 'CreateSubDomain', {
      env: { region: 'us-east-1' }
    },
    {
      stacksettings: {
        environment: 'dev'
      }
    });
 
    const deploydev = this.pipeline.addApplicationStage(devstage);

    const policy = new PolicyStatement({ 
      actions: [ "s3:ListAllMyBuckets" ],
      resources: [ "arn:aws:s3:::*" ]
    });

    deploydev.addActions(new ShellScriptAction({
      actionName: 'TestInfra',
      rolePolicyStatements: [ policy ],
      useOutputs: {
        // Get the stack Output from the Stage and make it available in
        // the shell script as $ZoneInfo
        ZONE_INFO: this.pipeline.stackOutput(devstage.ZoneInfo),
      },
      commands: [
        'echo $ZONE_INFO',
      ],
    }));

    this.pipeline.addApplicationStage(new PipelineStage(this, 'UpdateTLDZoneDelegation', {
      env: { region: 'us-east-1' }
    },
    {
      stacksettings: {
        environment: 'root'
      }
    }));

  }
}
