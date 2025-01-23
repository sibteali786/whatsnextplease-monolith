import * as cdk from 'aws-cdk-lib';
import { S3Stack } from '../lib/s3-stack';
import { LambdaStack } from '../lib/lambda-stack';

const app = new cdk.App();

// S3 Stack
const s3Stack = new S3Stack(app, 'MyS3Stack', {
  env: {
    region: 'us-east-1',
  },
});

// Lambda Stack with S3 bucket access
new LambdaStack(app, 'WnpLambdaStack', {
  bucket: s3Stack.bucket,
});
