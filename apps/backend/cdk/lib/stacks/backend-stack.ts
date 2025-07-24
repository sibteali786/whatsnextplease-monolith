import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { Stage } from '../stage';

export interface WnpBackendStackProps extends cdk.StackProps {
  stage: Stage;
}

export class WnpBackendStack extends cdk.Stack {
  public readonly ecsService: ecs.FargateService;
  public readonly ecrRepository: ecr.Repository;
  public readonly networkLoadBalancer: elbv2.NetworkLoadBalancer;

  constructor(scope: Construct, id: string, props: WnpBackendStackProps) {
    super(scope, id, props);
    const isProduction = props.stage === Stage.PRODUCTION;

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

    // Skip Fargate service creation in first deployment as it looks for empty ECR repository
    if (process.env.SKIP_FARGATE !== 'true') {
      // Create a task definition
      const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
        memoryLimitMiB: 512, // Minimum viable memory
        cpu: 256, // Minimum viable CPU
      });

      // Add container to task definition
      const container = taskDefinition.addContainer('WnpBackendContainer', {
        image: ecs.ContainerImage.fromEcrRepository(this.ecrRepository, 'latest'),
        environment: {
          NODE_ENV: props.stage,
          PORT: '3000',
        },
        secrets: {
          DATABASE_URL: ecs.Secret.fromSecretsManager(databaseSecret),
        },
        logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'wnp-backend' }),
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

      const secretsPolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['secretsmanager:GetSecretValue'],
        resources: [`arn:aws:secretsmanager:${this.region}:${this.account}:secret:APIGatewayUrl*`],
      });

      // Add the policy to the task execution role
      taskDefinition.taskRole.addToPrincipalPolicy(secretsPolicy);

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
        'arn:aws:acm:us-east-1:519076116465:certificate/32c2237e-176f-469d-832e-c9d1e95ddccd'
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

    // Output the ECR repository URI
    new cdk.CfnOutput(this, 'ECRRepositoryURI', {
      value: this.ecrRepository.repositoryUri,
      description: 'ECR Repository URI',
      exportName: `ECRRepositoryURI-${props.stage}`,
    });
  }
}
