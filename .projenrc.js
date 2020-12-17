const { AwsCdkTypeScriptApp } = require('projen');

const project = new AwsCdkTypeScriptApp({
  name: "CrossRouter53",
  authorName: 'Roman Naumenko',
  authorAddress: 'roman@naumenko.ca',
  repository: 'https://github.com/OperationalFallacy/CrossRouter53',
  description: 'CDK application to create cross account Route53 delegated zones',
  keywords: ['cdk', 'dns', 'route53'],
  cdkVersion: '1.78.0',
  cdkDependencies: ['@aws-cdk/aws-iam', '@aws-cdk/aws-iam', '@aws-cdk/pipelines', '@aws-cdk/aws-route53', '@aws-cdk/aws-codepipeline-actions', '@aws-cdk/aws-codepipeline'],
  cdkTestDependencies: ['@aws-cdk/assert'],
  gitignore: ['__snapshots__','LICENSE'],
  rebuildBot: false,
  // Not using this service
  dependabot: false,
  license: 'Apache-2.0',
  // Not using github - however enable it to see example of build workflow for CDK 
  buildWorkflow: false,
  mergify: false
});

project.synth();
