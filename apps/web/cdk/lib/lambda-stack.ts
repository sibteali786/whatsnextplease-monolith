import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as apigateway from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

interface LambdaStackProps extends cdk.StackProps {
  bucket: s3.Bucket;
}

export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    // Lambda function for generating upload URL
    const lambdaFunction = new lambda.Function(
      this,
      "GenerateUploadUrlFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset("lambda"), // path to your Lambda code
        environment: {
          BUCKET_NAME: props.bucket.bucketName,
          API_GATEWAY_SECRET_NAME: "APIGatewayUrl",
        },
      },
    );

    // Lambda function for generating download URL
    const downloadLambdaFunction = new lambda.Function(
      this,
      "GenerateDownloadUrlFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "download.handler",
        code: lambda.Code.fromAsset("lambda"),
        environment: {
          BUCKET_NAME: props.bucket.bucketName,
          API_GATEWAY_SECRET_NAME: "APIGatewayUrl",
        },
      },
    );

    // Grant the Lambda `s3:PutObject` and `s3:GetObject` permissions for the S3 bucket
    lambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject", "s3:GetObject"],
        resources: [props.bucket.arnForObjects("*")],
      }),
    );

    // Grant permissions for download Lambda
    downloadLambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [props.bucket.arnForObjects("*")],
      }),
    );

    // Grant the Lambda permissions to read the API Gateway URL from Secrets Manager
    lambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: [
          `arn:aws:secretsmanager:${this.region}:${this.account}:secret:APIGatewayUrl*`,
        ],
      }),
    );

    // HTTP API Gateway with specific route
    const httpApi = new apigateway.HttpApi(this, "UploadApi", {
      corsPreflight: {
        allowHeaders: ["Content-Type"],
        allowMethods: [
          apigateway.CorsHttpMethod.GET,
          apigateway.CorsHttpMethod.POST,
        ],
        allowOrigins: ["*"], // Update with specific domains for production
      },
    });

    // Add upload route to API Gateway
    httpApi.addRoutes({
      path: "/generate-upload-url",
      methods: [apigateway.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration(
        "LambdaIntegration",
        lambdaFunction,
      ),
    });
    // Add download route to API Gateway
    httpApi.addRoutes({
      path: "/generate-download-url",
      methods: [apigateway.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration(
        "DownloadLambdaIntegration",
        downloadLambdaFunction,
      ),
    });
    // Outputs
    new cdk.CfnOutput(this, "ApiUrl", {
      value: `${httpApi.url ?? "API URL Not Available"}generate-upload-url`,
    });
    new cdk.CfnOutput(this, "BucketName", {
      value: props.bucket.bucketName,
    });

    // Store API Gateway URL in Secrets Manager
    if (httpApi.url) {
      new secretsmanager.Secret(this, "APIGatewayUrl", {
        secretObjectValue: {
          apiGateUrl: cdk.SecretValue.unsafePlainText(httpApi.url),
        },
      });
    }
  }
}
