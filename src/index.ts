import * as cdk from '@aws-cdk/core';
import { PipelineStack } from '../src/pipeline-stack';

const app = new cdk.App();

new PipelineStack(app, 'Route53-Pipeline', {
  name: 'Route53',
  env: {
    account: '138847631892',
    region: 'us-east-1',
  },
});

// root  	208334959160
// cicd    138847631892
// dev     164411640669