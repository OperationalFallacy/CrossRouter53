import * as cdk from '@aws-cdk/core';
import { AppStage } from '../src/app-stage';
import { PipelineStack } from '../src/pipeline-stack';

const app = new cdk.App();

const delivery = new PipelineStack(app, 'Route53-Pipeline', {
  name: 'Route53',
  env: {
    account: '208334959160',
    region: 'us-east-1'
  }
});

delivery.pipeline.addApplicationStage(
  new AppStage(app, 'App', {
    env: {
      account: '208334959160',
      region: 'us-east-1',
    },
  })
);
