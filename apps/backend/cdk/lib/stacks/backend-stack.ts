import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { Stage } from '../stage';

export interface WnpBackendStackProps extends cdk.StackProps {
  stage: Stage;
}

export class WnpBackendStack extends cdk.Stack {
  public readonly ecsService: ecs.FargateService;
  public readonly ecrRepository: ecr.Repository;
  public readonly networkLoadBalancer: elbv2.NetworkLoadBalancer;
  public readonly s3Bucket: s3.Bucket;
  public readonly cloudFrontDistribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: WnpBackendStackProps) {
    super(scope, id, props);
    const isProduction = props.stage === Stage.PRODUCTION;

    // Create S3 bucket (moved from S3Stack)
    this.s3Bucket = new s3.Bucket(this, 'WnpS3Bucket', {
      bucketName: `wnp-media-${props.stage.toLowerCase()}`,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProduction,
      versioned: isProduction, // Enable versioning in production for better data protection
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.HEAD,
            s3.HttpMethods.POST, // For multipart uploads
            s3.HttpMethods.DELETE, // If you need client-side deletions
          ],
          allowedOrigins: ['*'], // Restrict this in production to your domains
          allowedHeaders: [
            '*',
            'Range',
            'Accept-Ranges',
            'Content-Type',
            'Content-Length',
            'Content-MD5',
            'x-amz-content-sha256',
          ],
          exposedHeaders: [
            'ETag',
            'Content-Length',
            'Content-Type',
            'Content-Range',
            'Accept-Ranges',
            'Last-Modified',
            'x-amz-version-id',
          ],
          maxAge: 3600,
        },
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          id: 'DeleteIncompleteMultipartUploads',
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        },
        // Add more lifecycle rules as needed
        ...(isProduction
          ? []
          : [
              {
                id: 'DeleteOldVersions',
                noncurrentVersionExpiration: cdk.Duration.days(30),
              },
            ]),
      ],
    });

    // Create CloudFront Origin Access Control (moved from S3Stack)
    const oac = new cloudfront.S3OriginAccessControl(this, 'WnpOAC', {
      signing: cloudfront.Signing.SIGV4_ALWAYS,
      originAccessControlName: `WnpS3BucketOAC-${props.stage}`,
    });

    // Create CloudFront distribution (simplified - remove Lambda@Edge for now)
    this.cloudFrontDistribution = new cloudfront.Distribution(this, 'WnpDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.s3Bucket, {
          originAccessControl: oac,
        }),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy: new cloudfront.ResponseHeadersPolicy(this, 'CorsHeadersPolicy', {
          corsBehavior: {
            accessControlAllowCredentials: false,
            accessControlAllowHeaders: [
              'Authorization',
              'Content-Type',
              'Range',
              'Accept-Ranges',
              'Content-Length',
              'Content-MD5',
            ],
            accessControlAllowMethods: ['GET', 'HEAD', 'OPTIONS'],
            accessControlAllowOrigins: ['*'], // Restrict in production
            originOverride: true,
          },
          securityHeadersBehavior: {
            contentTypeOptions: { override: false }, // AWS manages this
            referrerPolicy: {
              referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
              override: false,
            },
            strictTransportSecurity: {
              accessControlMaxAge: cdk.Duration.seconds(31536000),
              includeSubdomains: true,
              preload: true,
              override: false,
            },
          },
        }),
        // Note: Removed Lambda@Edge for now - can add back if needed for advanced auth
      },
    });

    // Add S3 bucket policy for CloudFront access
    const bucketPolicyStatement = new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:GetObjectAttributes'],
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
      resources: [this.s3Bucket.arnForObjects('*')],
      conditions: {
        StringEquals: {
          'AWS:SourceArn': `arn:aws:cloudfront::${cdk.Stack.of(this).account}:distribution/${this.cloudFrontDistribution.distributionId}`,
        },
      },
    });
    this.s3Bucket.addToResourcePolicy(bucketPolicyStatement);

    // Create a VPC - COST REDUCTION: Single AZ, no NAT Gateways
    const vpc = new ec2.Vpc(this, 'WnpBackendVPC', {
      maxAzs: 1, // COST REDUCTION: Using only one AZ
      natGateways: 0, // No NAT Gateways
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
      vpcName: `wnp-backend-vpc-${props.stage}`,
    });

    // Create an ECS cluster
    const cluster = new ecs.Cluster(this, 'WnpBackendCluster', {
      vpc,
      containerInsights: false, // COST REDUCTION: Disable Container Insights
      clusterName: `wnp-backend-cluster-${props.stage}`,
    });

    // Create an ECR repository
    this.ecrRepository = new ecr.Repository(this, 'BackendRepo', {
      repositoryName: `wnp-backend-repo-${props.stage}`,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: !isProduction,
      lifecycleRules: [
        {
          maxImageCount: isProduction ? 6 : 5, // COST REDUCTION: Keep fewer images
          description: 'keep only recent images',
        },
      ],
    });

    // Fetch Database URL from Secrets Manager
    const databaseSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'DatabaseSecret',
      `database-url-${props.stage}` // actual secret name
    );

    const nextPublicAppUrlSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'NextPublicAppUrlSecret',
      `next-public-app-url-${props.stage}` // actual secret name
    );

    // Skip Fargate service creation in first deployment as it looks for empty ECR repository
    if (process.env.SKIP_FARGATE !== 'true') {
      // Create a task definition
      const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
        memoryLimitMiB: 512, // Minimum viable memory
        cpu: 256, // Minimum viable CPU
      });

      // Enhanced IAM policies for ECS task to access S3
      const s3FullAccessPolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject',
          's3:GetObjectAttributes',
          's3:PutObjectAcl',
          's3:ListBucket',
        ],
        resources: [this.s3Bucket.bucketArn, this.s3Bucket.arnForObjects('*')],
      });

      // Add S3 permissions to task role (not just execution role)
      taskDefinition.taskRole.addToPrincipalPolicy(s3FullAccessPolicy);

      // Add container to task definition
      const container = taskDefinition.addContainer('WnpBackendContainer', {
        image: ecs.ContainerImage.fromEcrRepository(this.ecrRepository, 'latest'),
        environment: {
          NODE_ENV: props.stage,
          PORT: '3000',
          // S3 Configuration (no more Lambda/API Gateway dependencies)
          AWS_REGION: 'us-east-1',
          S3_BUCKET_NAME: this.s3Bucket.bucketName,
          CLOUDFRONT_DOMAIN: this.cloudFrontDistribution.distributionDomainName,
          LOG_LEVEL: isProduction ? 'debug' : 'debug',
        },
        secrets: {
          DATABASE_URL: ecs.Secret.fromSecretsManager(databaseSecret),
          NEXT_PUBLIC_APP_URL: ecs.Secret.fromSecretsManager(nextPublicAppUrlSecret),
        },
        logging: ecs.LogDrivers.awsLogs({
          streamPrefix: 'wnp-backend',
          logRetention: logs.RetentionDays.ONE_WEEK, // Cost optimization
        }),
      });

      // Add port mapping
      container.addPortMappings({
        containerPort: 3000,
        hostPort: 3000,
        protocol: ecs.Protocol.TCP,
      });

      // Create a security group for the Fargate service
      const serviceSG = new ec2.SecurityGroup(this, 'ServiceSecurityGroup', {
        vpc,
        description: 'Security group for the Fargate service',
        allowAllOutbound: true,
      });

      // Allow inbound traffic on container port
      serviceSG.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(3000),
        'Allow incoming traffic to container port'
      );

      // Create the Fargate service
      this.ecsService = new ecs.FargateService(this, 'WnpBackendService', {
        cluster,
        taskDefinition,
        assignPublicIp: true, // Required for public subnets without NAT
        desiredCount: 1, // Single task
        serviceName: `wnp-backend-service-${props.stage}`,
        securityGroups: [serviceSG],
        // COST REDUCTION: Using Fargate Spot for ~70% cost savings
        capacityProviderStrategies: [
          {
            capacityProvider: 'FARGATE_SPOT',
            weight: 1,
          },
        ],
      });

      const certificate = acm.Certificate.fromCertificateArn(
        this,
        'ApiCertificate',
        'arn:aws:acm:us-east-1:519076116465:certificate/4f07baf8-6438-47e8-bc56-8a74285946d9'
      );

      // Create a Network Load Balancer (cheaper than ALB)
      this.networkLoadBalancer = new elbv2.NetworkLoadBalancer(this, 'WnpBackendNLB', {
        vpc,
        internetFacing: true,
        loadBalancerName: `wnp-backend-nlb-${props.stage}`,
        // COST REDUCTION: Deploy in same AZ as the service
        vpcSubnets: { subnets: vpc.publicSubnets },
      });

      // Create a target group for the service
      const targetGroup = new elbv2.NetworkTargetGroup(this, 'TargetGroup', {
        vpc,
        port: 3000,
        protocol: elbv2.Protocol.TCP,
        targetType: elbv2.TargetType.IP,
        healthCheck: {
          enabled: true,
          port: '3000',
          protocol: elbv2.Protocol.HTTP,
          path: '/health',
          interval: cdk.Duration.minutes(5), // Reduced frequency
          healthyThresholdCount: 2,
          unhealthyThresholdCount: 2,
        },
      });

      // Register targets
      targetGroup.addTarget(this.ecsService);

      // Create a listener
      const httpListener = this.networkLoadBalancer.addListener('Listener', {
        port: 80,
        protocol: elbv2.Protocol.TCP,
        defaultTargetGroups: [targetGroup],
      });

      const httpsListener = this.networkLoadBalancer.addListener('HttpsListener', {
        port: 443,
        protocol: elbv2.Protocol.TLS,
        certificates: [certificate],
        defaultTargetGroups: [targetGroup],
      });

      // Output the NLB DNS name
      new cdk.CfnOutput(this, 'LoadBalancerDNS', {
        value: this.networkLoadBalancer.loadBalancerDnsName,
        description: 'Network Load Balancer DNS Name',
        exportName: `LoadBalancerDNS-${props.stage}`,
      });

      // Output both listener ARNs
      new cdk.CfnOutput(this, 'HttpListenerARN', {
        value: httpListener.listenerArn,
        description: 'Network Load Balancer HTTP Listener ARN',
        exportName: `HttpListenerARN-${props.stage}`,
      });

      new cdk.CfnOutput(this, 'HttpsListenerARN', {
        value: httpsListener.listenerArn,
        description: 'Network Load Balancer HTTPS Listener ARN',
        exportName: `HttpsListenerARN-${props.stage}`,
      });
    }

    // S3 and CloudFront Outputs (moved from S3Stack)
    new cdk.CfnOutput(this, 'S3BucketName', {
      value: this.s3Bucket.bucketName,
      description: 'S3 Bucket Name for Media Storage',
      exportName: `S3BucketName-${props.stage}`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.cloudFrontDistribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: `CloudFrontDistributionId-${props.stage}`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDomainName', {
      value: this.cloudFrontDistribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
      exportName: `CloudFrontDomainName-${props.stage}`,
    });

    // Output the ECR repository URI
    new cdk.CfnOutput(this, 'ECRRepositoryURI', {
      value: this.ecrRepository.repositoryUri,
      description: 'ECR Repository URI',
      exportName: `ECRRepositoryURI-${props.stage}`,
    });
  }
}
