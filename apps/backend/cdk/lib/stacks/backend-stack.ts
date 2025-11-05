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
import * as ses from 'aws-cdk-lib/aws-ses'; // ADD THIS IMPORT
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

    // ========================================
    // S3 BUCKET SETUP (Keep as is)
    // ========================================
    this.s3Bucket = new s3.Bucket(this, 'WnpS3Bucket', {
      bucketName: `wnp-media-${props.stage.toLowerCase()}`,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProduction,
      versioned: isProduction,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.HEAD,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
          ],
          allowedOrigins: ['*'],
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

    // ========================================
    // CLOUDFRONT SETUP (Keep as is)
    // ========================================
    const oac = new cloudfront.S3OriginAccessControl(this, 'WnpOAC', {
      signing: cloudfront.Signing.SIGV4_ALWAYS,
      originAccessControlName: `WnpS3BucketOAC-${props.stage}`,
    });

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
            accessControlAllowOrigins: ['*'],
            originOverride: true,
          },
          securityHeadersBehavior: {
            contentTypeOptions: { override: false },
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
      },
    });

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

    // ========================================
    // 🆕 SES SETUP - ADD THIS NEW SECTION HERE
    // ========================================

    // 1. Create Email Identity for whatnextplease.com
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let emailIdentity: ses.IEmailIdentity;

    if (!isProduction) {
      // Development: Create the email identity
      new ses.EmailIdentity(this, 'WnpEmailIdentity', {
        identity: ses.Identity.domain('whatnextplease.com'),
        mailFromDomain: 'mail.whatnextplease.com',
        dkimSigning: true,
        dkimIdentity: ses.DkimIdentity.easyDkim(ses.EasyDkimSigningKeyLength.RSA_2048_BIT),
      });
    } else {
      // Production: Reference the existing identity from development
      ses.EmailIdentity.fromEmailIdentityName(this, 'WnpEmailIdentity', 'whatnextplease.com');
    }

    // Configuration Set: Create separately for each environment
    const configurationSet = new ses.ConfigurationSet(this, 'WnpEmailConfigSet', {
      configurationSetName: `wnp-email-config-${props.stage}`,
      reputationMetrics: true,
      sendingEnabled: true,
    });

    configurationSet.addEventDestination('WnpEmailEvents', {
      destination: ses.EventDestination.cloudWatchDimensions([
        {
          name: 'email-type',
          defaultValue: 'transactional',
          source: ses.CloudWatchDimensionSource.MESSAGE_TAG,
        },
        {
          name: 'environment',
          defaultValue: props.stage.toLowerCase(),
          source: ses.CloudWatchDimensionSource.MESSAGE_TAG,
        },
      ]),
      events: [
        ses.EmailSendingEvent.SEND,
        ses.EmailSendingEvent.DELIVERY,
        ses.EmailSendingEvent.BOUNCE,
        ses.EmailSendingEvent.COMPLAINT,
        ses.EmailSendingEvent.REJECT,
        ses.EmailSendingEvent.OPEN,
        ses.EmailSendingEvent.CLICK,
      ],
      enabled: true,
    });
    // ========================================
    // VPC AND ECS SETUP (Keep as is)
    // ========================================
    const vpc = new ec2.Vpc(this, 'WnpBackendVPC', {
      maxAzs: 1,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
      vpcName: `wnp-backend-vpc-${props.stage}`,
    });

    const cluster = new ecs.Cluster(this, 'WnpBackendCluster', {
      vpc,
      containerInsights: false,
      clusterName: `wnp-backend-cluster-${props.stage}`,
    });

    this.ecrRepository = new ecr.Repository(this, 'BackendRepo', {
      repositoryName: `wnp-backend-repo-${props.stage}`,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: !isProduction,
      lifecycleRules: [
        {
          maxImageCount: isProduction ? 6 : 5,
          description: 'keep only recent images',
        },
      ],
    });

    const databaseSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'DatabaseSecret',
      `database-url-${props.stage}`
    );

    const nextPublicAppUrlSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'NextPublicAppUrlSecret',
      `next-public-app-url-${props.stage}`
    );
    const chatAppApiUrlSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'ChatAppApiUrlSecret',
      `chat-app-api-url`
    );
    const allowedOriginsChatSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'AllowedOriginsChatSecret',
      `allowed-origins-chat`
    );

    // ========================================
    // FARGATE SERVICE SETUP
    // ========================================
    if (process.env.SKIP_FARGATE !== 'true') {
      const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
        memoryLimitMiB: 512,
        cpu: 256,
      });

      // ========================================
      // 🆕 IAM POLICIES - UPDATED SECTION
      // ========================================

      // S3 Access Policy (existing - keep as is)
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

      // 🆕 SES Access Policy - ADD THIS NEW POLICY
      const sesPolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ses:SendEmail', // Send simple email
          'ses:SendRawEmail', // Send email with attachments
          'ses:SendTemplatedEmail', // Send using SES templates (optional)
        ],
        resources: [
          // Restrict to your specific domain identity
          `arn:aws:ses:${this.region}:${this.account}:identity/whatnextplease.com`,
          // Allow using the configuration set
          `arn:aws:ses:${this.region}:${this.account}:configuration-set/${configurationSet.configurationSetName}`,
        ],
        conditions: {
          // Additional security: only allow sending from verified addresses
          StringLike: {
            'ses:FromAddress': [
              '*@whatnextplease.com', // Any email from your domain
            ],
            ...(isProduction
              ? {}
              : {
                  'ses:Recipients': ['*@hillcountrycoders.com'],
                }),
          },
        },
      });

      // 🆕 Apply both policies to the task role
      // WHY TASK ROLE: The task role is used by your application code running in the container
      // WHY NOT EXECUTION ROLE: Execution role is only for ECS to pull images and write logs
      taskDefinition.taskRole.addToPrincipalPolicy(s3FullAccessPolicy);
      taskDefinition.taskRole.addToPrincipalPolicy(sesPolicy);

      // ========================================
      // 🆕 CONTAINER DEFINITION - UPDATED WITH SES ENV VARS
      // ========================================
      const container = taskDefinition.addContainer('WnpBackendContainer', {
        image: ecs.ContainerImage.fromEcrRepository(this.ecrRepository, 'latest'),
        environment: {
          NODE_ENV: props.stage,
          PORT: '3000',

          // S3 Configuration (existing)
          AWS_REGION: 'us-east-1',
          S3_BUCKET_NAME: this.s3Bucket.bucketName,
          CLOUDFRONT_DOMAIN: this.cloudFrontDistribution.distributionDomainName,

          // 🆕 SES Configuration - ADD THESE NEW VARIABLES
          SES_REGION: 'us-east-1', // SES is regional, ensure it matches your setup
          SES_FROM_EMAIL: 'noreply@whatnextplease.com', // Default sender email
          SES_REPLY_TO_EMAIL: 'support@whatnextplease.com', // Optional reply-to
          SES_CONFIGURATION_SET: configurationSet.configurationSetName,
          SES_VERIFIED_DOMAIN: 'whatnextplease.com',

          EMAIL_WHITELIST: isProduction
            ? ''
            : '*@hillcountrycoders.com,sbaqar@hillcountrycoders.com',
          // Logging
          LOG_LEVEL: isProduction ? 'info' : 'debug',
        },
        secrets: {
          DATABASE_URL: ecs.Secret.fromSecretsManager(databaseSecret),
          NEXT_PUBLIC_APP_URL: ecs.Secret.fromSecretsManager(nextPublicAppUrlSecret),
          ALLOWED_ORIGIS: ecs.Secret.fromSecretsManager(allowedOriginsChatSecret),
          CHAT_APP_API_URL: ecs.Secret.fromSecretsManager(chatAppApiUrlSecret),
        },
        logging: ecs.LogDrivers.awsLogs({
          streamPrefix: 'wnp-backend',
          logRetention: logs.RetentionDays.ONE_WEEK,
        }),
      });

      container.addPortMappings({
        containerPort: 3000,
        hostPort: 3000,
        protocol: ecs.Protocol.TCP,
      });

      // ========================================
      // SECURITY GROUP AND SERVICE (Keep as is)
      // ========================================
      const serviceSG = new ec2.SecurityGroup(this, 'ServiceSecurityGroup', {
        vpc,
        description: 'Security group for the Fargate service',
        allowAllOutbound: true,
      });

      serviceSG.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(3000),
        'Allow incoming traffic to container port'
      );

      this.ecsService = new ecs.FargateService(this, 'WnpBackendService', {
        cluster,
        taskDefinition,
        assignPublicIp: true,
        desiredCount: 1,
        serviceName: `wnp-backend-service-${props.stage}`,
        securityGroups: [serviceSG],
        capacityProviderStrategies: [
          {
            capacityProvider: 'FARGATE_SPOT',
            weight: 1,
          },
        ],
      });

      // ========================================
      // LOAD BALANCER SETUP (Keep as is)
      // ========================================
      const certificate = acm.Certificate.fromCertificateArn(
        this,
        'ApiCertificate',
        'arn:aws:acm:us-east-1:519076116465:certificate/4f07baf8-6438-47e8-bc56-8a74285946d9'
      );

      this.networkLoadBalancer = new elbv2.NetworkLoadBalancer(this, 'WnpBackendNLB', {
        vpc,
        internetFacing: true,
        loadBalancerName: `wnp-backend-nlb-${props.stage}`,
        vpcSubnets: { subnets: vpc.publicSubnets },
      });

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
          interval: cdk.Duration.minutes(5),
          healthyThresholdCount: 2,
          unhealthyThresholdCount: 2,
        },
      });

      targetGroup.addTarget(this.ecsService);

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

      // ========================================
      // OUTPUTS - LOAD BALANCER
      // ========================================
      new cdk.CfnOutput(this, 'LoadBalancerDNS', {
        value: this.networkLoadBalancer.loadBalancerDnsName,
        description: 'Network Load Balancer DNS Name',
        exportName: `LoadBalancerDNS-${props.stage}`,
      });

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

    // ========================================
    // OUTPUTS - S3 AND CLOUDFRONT (Keep as is)
    // ========================================
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

    new cdk.CfnOutput(this, 'ECRRepositoryURI', {
      value: this.ecrRepository.repositoryUri,
      description: 'ECR Repository URI',
      exportName: `ECRRepositoryURI-${props.stage}`,
    });

    // ========================================
    // 🆕 OUTPUTS - SES - ADD THESE NEW OUTPUTS
    // ========================================
    new cdk.CfnOutput(this, 'SESVerifiedDomain', {
      value: 'whatnextplease.com',
      description: 'SES Verified Domain',
      exportName: `SESVerifiedDomain-${props.stage}`,
    });

    new cdk.CfnOutput(this, 'SESConfigurationSet', {
      value: configurationSet.configurationSetName,
      description: 'SES Configuration Set Name',
      exportName: `SESConfigurationSet-${props.stage}`,
    });

    new cdk.CfnOutput(this, 'SESFromEmail', {
      value: 'noreply@whatnextplease.com',
      description: 'Default SES From Email Address',
      exportName: `SESFromEmail-${props.stage}`,
    });

    new cdk.CfnOutput(this, 'SESMailFromDomain', {
      value: 'mail.whatnextplease.com',
      description:
        'MAIL FROM domain - Configure MX record: 10 feedback-smtp.us-east-1.amazonses.com',
      exportName: `SESMailFromDomain-${props.stage}`,
    });

    new cdk.CfnOutput(this, 'SESMailFromMXRecord', {
      value: '10 feedback-smtp.us-east-1.amazonses.com',
      description: 'MX record value for MAIL FROM domain',
      exportName: `SESMailFromMXRecord-${props.stage}`,
    });

    new cdk.CfnOutput(this, 'SESDKIMRecords', {
      value: 'Check Route53 or SES Console for CNAME records to add to your DNS',
      description: 'DKIM CNAME records (3 records) - must be added to DNS for email authentication',
      exportName: `SESDKIMRecordsInfo-${props.stage}`,
    });

    new cdk.CfnOutput(this, 'SESSandboxWarning', {
      value: isProduction
        ? 'PRODUCTION - Request production access if not already done'
        : 'DEVELOPMENT - SES in sandbox mode. Only verified emails can receive messages.',
      description: 'SES Account Status Reminder',
    });
  }
}
