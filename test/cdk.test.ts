import { SynthUtils } from '@aws-cdk/assert';
import { App } from '@aws-cdk/core';

import { Route53Stack } from '../src/route53-stack';

test('stack', () => {
  const app = new App();
  const stack = new Route53Stack(app, 'Stack');
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});