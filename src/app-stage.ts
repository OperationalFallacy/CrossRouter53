
import * as cdk from '@aws-cdk/core';
import { Route53Stack } from './route53-stack';

export class AppStage extends cdk.Stage {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);

    new Route53Stack(this, 'Route53Stack');
  }
}

