
import { PublicHostedZone } from '@aws-cdk/aws-route53';
import { Stack, Construct, Fn, StackProps, CfnOutput } from '@aws-cdk/core';
 
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
    
    const zone = new PublicHostedZone(this, 'zone', {
      zoneName: stackconfig?.stacksettings?.environment!,
      comment: 'Hosted zone for ' + stackconfig?.stacksettings?.environment!
    });

    let cfo = new CfnOutput(this, 'ZoneNameServers', {
      value: 'UNDEFINED',
      description: 'Delegation record for zone: ' + stackconfig?.stacksettings?.hostedZone!
    });

    if (zone.hostedZoneNameServers) {
      cfo.value = Fn.join(',', zone.hostedZoneNameServers)
      this.ZoneInfo = cfo
    } else {
      this.ZoneInfo = cfo
    }
  }
}