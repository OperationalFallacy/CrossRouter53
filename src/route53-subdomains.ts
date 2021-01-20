
import { PublicHostedZone } from '@aws-cdk/aws-route53';
import { Stack, Construct, Fn, StackProps, CfnOutput } from '@aws-cdk/core';
 
export class stackSettings {
  readonly stacksettings?: {
    readonly environment?: string
  }
}

export class SubdomainsStack extends Stack {
  public readonly ZoneInfo: CfnOutput;
  
  constructor(scope: Construct, id: string, props?: StackProps, stackconfig?: stackSettings) {
    super(scope, id, props);
    
    const zone = new PublicHostedZone(this, 'zone', {
      zoneName: stackconfig?.stacksettings?.environment! + '.naumenko.ca',
      comment: 'Hosted zone for ' + stackconfig?.stacksettings?.environment!
    });

    let cfo = new CfnOutput(this, 'ZoneNameServers', {
      value: 'UNDEFINED',
      description: 'Delegation record for zone: ' + stackconfig?.stacksettings?.environment 
    });

    let zoneId = new CfnOutput(this, 'DefaultZoneId', {
      value: 'UNDEFINED',
      description: 'Route53 Zone Id for account default domain: ' + stackconfig?.stacksettings?.environment + '.naumenko.ca'
    });


    if (zone.hostedZoneNameServers) {
      cfo.value = Fn.join(',', zone.hostedZoneNameServers)
      zoneId.value = zone.hostedZoneId
      this.ZoneInfo = cfo
    } else {
      this.ZoneInfo = cfo
    }
  }
}

