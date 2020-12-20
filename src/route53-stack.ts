
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

    this.ZoneInfo = new CfnOutput(this, 'ZoneNameServers', {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: zone.hostedZoneNameServers!.join(','),
      description: 'Hosted zone Name Servers for zone: ' + zone.zoneName
    });

    // delegation https://github.com/cdk-cosmos/cosmos/blob/ef87c03ab52ca38d01a99fea2211e03eb0d04ad9/packages/%40cdk-cosmos/core/src/features/domain-feature/subdomain-feature-stack.ts
  }
}
