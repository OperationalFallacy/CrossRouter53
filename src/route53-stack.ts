
import { PublicHostedZone } from '@aws-cdk/aws-route53';
import { Stack, Construct, StackProps, CfnOutput } from '@aws-cdk/core';

export class stackSettings {
  readonly stacksettings?: {
    readonly environment?: string
  }
}

export class Route53Stack extends Stack {
  public readonly ZoneInfo: CfnOutput;

  constructor(scope: Construct, id: string, props?: StackProps, stackconfig?: stackSettings) {
    super(scope, id, props);

    // Few zones that should be delegated
    const zone = new PublicHostedZone(this, 'HostedZone', {
      zoneName: stackconfig?.stacksettings?.environment + '.naumenko.ca',
    });

    this.ZoneInfo = new CfnOutput(this, 'ZoneInfo', {
      value: zone.hostedZoneNameServers ? zone.hostedZoneNameServers.toString() : 'UNDEFINED'

    });

  }
}
