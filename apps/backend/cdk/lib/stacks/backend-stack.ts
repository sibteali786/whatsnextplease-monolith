import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';
import { Stage } from '../stage';
import { ApplicationProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';

export interface WnpBackendStackProps extends cdk.StackProps {
  stage: Stage;
}

export class WnpBackendStack extends cdk.Stack {
  public readonly ecsService: ecs_patterns.ApplicationLoadBalancedFargateService;
  public readonly ecrRepository: ecr.Repository;
  constructor(scope: Construct, id: string, props: WnpBackendStackProps) {
    super(scope, id, props);
    const isProduction = props.stage === Stage.PRODUCTION;
    // Create a VPC
    const vpc = new ec2.Vpc(this, 'WnpBackendVPC', {
      maxAzs: 2,
      natGateways: isProduction ? 2 : 1,
      vpcName: `wnp-backend-vpc-${props.stage}`,
    });

    // create an ecs cluster
    const cluster = new ecs.Cluster(this, 'WnpBackendCluster', {
      vpc,
      containerInsights: true,
      clusterName: `wnp-backend-cluster-${props.stage}`,
    });

    // create an ECR repository
    this.ecrRepository = new ecr.Repository(this, 'BackendRepo', {
      repositoryName: `wnp-backend-repo-${props.stage}`,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteImages: !isProduction,
      lifecycleRules: [
        {
          maxImageCount: isProduction ? 100 : 20,
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
    // Configure service based on stage
    const serviceConfig = this.getServiceConfiguration(isProduction);
    this.ecsService = new ecs_patterns.ApplicationLoadBalancedFargateService(
      this,
      'WnpBackendService',
      {
        cluster,
        ...serviceConfig,
        taskImageOptions: {
          image: ecs.ContainerImage.fromEcrRepository(this.ecrRepository),
          environment: {
            NODE_ENV: props.stage,
          },
          secrets: {
            DATABASE_URL: ecs.Secret.fromSecretsManager(databaseSecret),
          },
          containerPort: 3000,
        },
        publicLoadBalancer: true,
        loadBalancerName: `wnp-backend-lb-${props.stage}`,
        serviceName: `wnp-backend-service-${props.stage}`,
        healthCheckGracePeriod: cdk.Duration.seconds(60),
      }
    );
    // Configure autoscaling for production
    if (isProduction) {
      this.configureAutoScaling(this.ecsService);
    }

    // Stack outputs
    this.addStackOutputs(props.stage);
  }
  private getServiceConfiguration(isProduction: boolean) {
    // Base configuration shared between environments
    const baseConfig = {
      memoryLimitMiB: isProduction ? 1024 : 512,
      desiredCount: isProduction ? 2 : 1,
      cpu: isProduction ? 512 : 256,
    };

    if (!isProduction) {
      // Development configuration - simple HTTP setup
      return {
        ...baseConfig,
        protocol: ApplicationProtocol.HTTP,
        targetProtocol: ApplicationProtocol.HTTP,
      };
    }

    // Production configuration - HTTPS with certificate
    const certificate = new certificatemanager.Certificate(this, 'ApiCertificate', {
      domainName: 'your-domain.com', // Replace with your domain
      validation: certificatemanager.CertificateValidation.fromDns(),
    });

    return {
      ...baseConfig,
      certificate,
      protocol: ApplicationProtocol.HTTPS,
      targetProtocol: ApplicationProtocol.HTTP,
      redirectHTTP: true,
    };
  }

  private configureAutoScaling(service: ecs_patterns.ApplicationLoadBalancedFargateService) {
    const scaling = service.service.autoScaleTaskCount({
      maxCapacity: 4,
      minCapacity: 2,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    scaling.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });
  }

  private addStackOutputs(stage: string) {
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: this.ecsService.loadBalancer.loadBalancerDnsName,
      description: 'Load Balancer DNS Name',
      exportName: `LoadBalancerDNS-${stage}`,
    });

    new cdk.CfnOutput(this, 'ECRRepositoryURI', {
      value: this.ecrRepository.repositoryUri,
      description: 'ECR Repository URI',
      exportName: `ECRRepositoryURI-${stage}`,
    });
  }
}
