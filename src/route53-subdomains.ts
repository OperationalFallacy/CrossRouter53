
import { PublicHostedZone, HostedZone, ZoneDelegationRecord } from '@aws-cdk/aws-route53';
import { Stack, Construct, StackProps, CfnOutput, Duration } from '@aws-cdk/core';
 
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

    if (stackconfig?.stacksettings?.hostedZone) {

      const rootZone =  HostedZone.fromLookup(this, 'Zone', { 
        domainName: 'naumenko.ca' 
      })
      let zone_info = JSON.parse(stackconfig.stacksettings.hostedZone)

      const delegationRecord = new ZoneDelegationRecord(this, 'delegated', {
        zone: rootZone,
        recordName: zone_info.hostedZoneId,
        nameServers: zone_info.hostedZoneNameServers,
        ttl: Duration.minutes(120),
        comment: 'Delegation for zone: ' + zone_info.hostedZoneId
      });
  
      this.ZoneInfo = new CfnOutput(this, 'ZoneNameServers', {
        value: JSON.stringify(delegationRecord),
        description: 'Delegation record for zone: ' + delegationRecord.domainName
      });
    } else {
      // Few zones that should be delegated
      const zone = new PublicHostedZone(this, 'HostedZone', {
        zoneName: stackconfig?.stacksettings?.environment + '.naumenko.ca',
      });
      
      console.log('Zone info:', JSON.stringify(zone))

      this.ZoneInfo = new CfnOutput(this, 'ZoneNameServers', {
        value: JSON.stringify(zone),
        description: 'Hosted zone Name Servers for zone: ' + zone.zoneName 
      });
    }
  }
}

