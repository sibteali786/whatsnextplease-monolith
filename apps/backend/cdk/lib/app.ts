import * as cdk from 'aws-cdk-lib';
import { Configuration } from './config';
import { WnpBackendStack } from './stacks/backend-stack';

export class WnpBackendApp extends cdk.App {
  readonly backendStack: WnpBackendStack;

  constructor(props: cdk.AppProps) {
    super(props);

    const stage = Configuration.getAppConfig().env.STAGE;

    const stackProps: cdk.StackProps = {
      // Enable termination protection in production
      terminationProtection: stage === 'production',
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
      },
      // Add stack tags for better resource management
      tags: {
        Environment: stage,
        Project: 'WNP-Backend',
        ManagedBy: 'CDK',
      },
    };

    // Initialize the backend stack
    this.backendStack = new WnpBackendStack(this, `WnpBackendStack-${stage}`, {
      ...stackProps,
      stage: stage,
    });
  }
}
