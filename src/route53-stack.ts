
import { Stack, Construct, StackProps }  from '@aws-cdk/core';
import { PublicHostedZone } from '@aws-cdk/aws-route53';

export class Route53Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Few zones that should be delegated
    new PublicHostedZone(this, 'HostedZone', {
      zoneName: 'zone1.naumenko.ca'
    });

  }
}
