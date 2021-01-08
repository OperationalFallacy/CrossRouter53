
import { Construct, Stage, StageProps, CfnOutput } from '@aws-cdk/core';
import { SubdomainsStack, stackSettings } from './route53-subdomains';
import { DelegationStack } from './route53-delegation';

export class SubdomainStage extends Stage {
  public readonly ZoneInfo: CfnOutput;
  public readonly TemplateFile: string;

  constructor(scope: Construct, id: string, props: StageProps, stackconfig: stackSettings) {
    super(scope, id, props);

    const service = new SubdomainsStack(this, 'Subdomain', {
      env: {
        region : 'us-east-1',
      }
   },
   stackconfig
   );
    // Expose output one level higher
    this.ZoneInfo = service.ZoneInfo;
    this.TemplateFile = service.templateFile
  }
}

export class DelegationStage extends Stage {
  public readonly TemplateFile: string;

  constructor(scope: Construct, id: string, props: StageProps, stackconfig: stackSettings) {
    super(scope, id, props);
    const service = new DelegationStack(this, 'Tld', {
      env: {
        region : 'us-east-1',
      }
   }
   );
    // Expose output one level higher
    this.TemplateFile = service.templateFile
  }
}