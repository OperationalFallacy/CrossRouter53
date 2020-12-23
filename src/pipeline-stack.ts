
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';
import * as cdk from '@aws-cdk/core';
import { CdkPipeline, SimpleSynthAction } from '@aws-cdk/pipelines';
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

    // function RunNextActionInParallel(s: CdkStage) {
    //   const currentRunOrder = s.nextSequentialRunOrder(0)
    //   s.nextSequentialRunOrder(1-currentRunOrder)
    // }

    CreateSubDomains.addApplication(devapp);
   // RunNextActionInParallel(ds)
    

    CreateSubDomains.addApplication(prodapp);
   // RunNextActionInParallel(ps)

    
    // prodstage.
    // def _run_next_action_in_parallel(stage: Stage):
    // current_run_order = stage.next_sequential_run_order(0)  # passing 0 means it doesn't advance the run oder
    // stage.next_sequential_run_order(1 - current_run_order)  # send the order back to 1 so the next stage runs in parallel
    
    
    //   stage.add_application(EpsRoute53(self, f"dev01-route53", env=environments["dev01"], account_identifier="dev01"))
    //   _run_next_action_in_parallel(stage)
    //   stage.add_application(EpsRoute53(self, f"dev02-route53", env=environments["dev02"], account_identifier="dev02"))
    //   _run_next_action_in_parallel(stage)
    
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
