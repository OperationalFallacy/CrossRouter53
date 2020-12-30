
import { PublicHostedZone } from '@aws-cdk/aws-route53';
import { Stack, Construct, Fn, StackProps, CfnOutput } from '@aws-cdk/core';

export class DelegationStack extends Stack {
  public readonly ZoneInfo: CfnOutput;
  
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    
    const zone = new PublicHostedZone(this, 'zone', {
      zoneName: 'naumenko.ca',
      comment: 'Hosted zone'
    });

    let cfo = new CfnOutput(this, 'ZoneNameServers', {
      value: 'UNDEFINED',
      description: 'Delegation record for zone'
    });

    if (zone.hostedZoneNameServers) {
      cfo.value = Fn.join(',', zone.hostedZoneNameServers)
      this.ZoneInfo = cfo
    } else {
      this.ZoneInfo = cfo
    }
  }
}