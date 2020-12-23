
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';
import * as cdk from '@aws-cdk/core';
import { CdkPipeline, SimpleSynthAction } from '@aws-cdk/pipelines';
import { PipelineStage } from './app-stage';

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

        // Found a workaround to add environment_variables inside environment instead of directly into SimpleSynthAction

        // synth_action = pipelines.SimpleSynthAction(
        //             source_artifact=source_artifact,
        //             environment={
        //                 'privileged': True,
        //                 'environment_variables': {
        //                    'DOCKER_PASSWORD': aws_codebuild.BuildEnvironmentVariable(
        //                        value='DOCKERHUB_PASSWORD',
        //                       type=aws_codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER)
        //                   }
        //             },
        //             cloud_assembly_artifact=cloud_assembly_artifact,
        //             install_commands=[
        //                 'npm install -g aws-cdk',
        //                 'pip install -r requirements.txt',
        //                 'docker login -u $DOCKER_LOGIN -p $DOCKER_PASSWORD'
        //             ],
        //             synth_command='cdk synth'
        //         )

      synthAction: SimpleSynthAction.standardYarnSynth({
        sourceArtifact,
        cloudAssemblyArtifact,
        environment: {
          privileged: true, // so that we can use Docker bundling
        }
      })
    })

    // This is where we add the application stages - it should be branch-based perhaps
    const devstage = new PipelineStage(this, 'CreateDevSubDomain', {
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

    const prodstage = new PipelineStage(this, 'CreateProdSubDomain', {
      env: { 
        region: 'us-east-1',
        account: '936281978805' 
      }
    },
    {
      stacksettings: {
        environment: 'prod',
        hostedZone: undefined
      }
    });

    
    this.pipeline.addApplicationStage(devstage);
    this.pipeline.addApplicationStage(prodstage);

    // const policy = new PolicyStatement({ 
    //   actions: [ "s3:ListAllMyBuckets" ],
    //   resources: [ "arn:aws:s3:::*" ]
    // });

    // const comboAction = new ShellScriptAction({
    //   actionName: 'TestInfra',
    //   rolePolicyStatements: [ policy ],
    //   useOutputs: {
    //     // Get the stack Output from the Stage and make it available in
    //     // the shell script as $ZoneInfo
    //     ZONE_INFO: this.pipeline.stackOutput(devstage.ZoneInfo),
    //   },
    //   commands: [
    //     'echo $ZONE_INFO',
    //     'export ZONE_INFO_'
    //   ],
    // })

    // deploydev.addActions(comboAction);

    this.pipeline.addApplicationStage(new PipelineStage(this, 'UpdateTLDZoneDelegation', {
      env: { 
        region: 'us-east-1',
        account: '208334959160'
      }
    },
    {
      stacksettings: {
        environment: 'root',
        hostedZone: this.pipeline.stackOutput(devstage.ZoneInfo).outputName.toString()
      }
    }));

  }
}
