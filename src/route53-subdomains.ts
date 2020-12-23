
import { HostedZone, ZoneDelegationRecord } from '@aws-cdk/aws-route53';
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
    
    const rootZone =  HostedZone.fromLookup(this, 'Zone', { 
      domainName: 'naumenko.ca' 
    })
    let zone_info = stackconfig?.stacksettings?.environment!

    const delegationRecord = new ZoneDelegationRecord(this, 'delegated', {
      zone: rootZone,
      recordName: zone_info,
      nameServers: [ zone_info ],
      ttl: Duration.minutes(120),
      comment: 'Delegation for zone: ' + zone_info
    });

    this.ZoneInfo = new CfnOutput(this, 'ZoneNameServers', {
      value: zone_info,
      description: 'Delegation record for zone: ' + delegationRecord.domainName
    });
  }
}

