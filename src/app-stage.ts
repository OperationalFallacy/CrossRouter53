
import { Construct, Stage, StageProps, CfnOutput } from '@aws-cdk/core';
import { Route53Stack, stackSettings } from './route53-stack';

export class AppStage extends Stage {
  public readonly ZoneInfo: CfnOutput;

  constructor(scope: Construct, id: string, props: StageProps, stackconfig: stackSettings) {
    super(scope, id, props);

    const service = new Route53Stack(this, 'Route53Stack-' + stackconfig.stacksettings?.environment, {
      env: {
        region : 'us-east-1',
      }
   },
   stackconfig
   );
    // Expose output one level higher
    this.ZoneInfo = service.ZoneInfo;
  }
}