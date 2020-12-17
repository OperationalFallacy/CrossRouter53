import { SynthUtils } from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/core';
import * as s from '../src/api-stack';

test('dlq creates an alarm', () => {
  const stack = new Stack();
  new s.ApiStack(stack, 'Stack');
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});