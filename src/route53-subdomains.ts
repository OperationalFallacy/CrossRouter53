
import { PublicHostedZone } from '@aws-cdk/aws-route53';
import { Stack, Construct, StackProps, CfnOutput } from '@aws-cdk/core';
 
export class stackSettings {
  readonly stacksettings?: {
    readonly environment?: string,
    readonly hostedZone: string | undefined
  }
}

export class Route53Stack extends Stack {
  public readonly ZoneInfo: CfnOutput;
  
  constructor(scope: Construct, id: string, props?: StackProps, stackconfig?: stackSettings) {
    super(scope, id, props);
    
    const zone = new PublicHostedZone(this, stackconfig?.stacksettings?.hostedZone!, {
      zoneName: stackconfig?.stacksettings?.environment!,
      comment: 'Hosted zone for ' + stackconfig?.stacksettings?.environment!
    });

    this.ZoneInfo = new CfnOutput(this, 'ZoneNameServers', {
      value: JSON.stringify(zone.hostedZoneNameServers?.join(",")),
      description: 'Delegation record for zone: ' + stackconfig?.stacksettings?.hostedZone!
    });
  }
}

