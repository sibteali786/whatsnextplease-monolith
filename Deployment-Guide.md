# Docker Deployment Automation Guide

This guide provides instructions for automating the Docker deployment process for your WNP backend application.

## Local Development Automation

The provided `deploy.sh` script automates your Docker build and local testing workflow, while the simpler `deploy-to-ecr.sh` handles ECR pushing.

### Setup Instructions

1. Save both scripts to the root of your project
2. Make them executable:
   ```bash
   chmod +x deploy.sh deploy-to-ecr.sh
   ```
3. Ensure AWS CLI is installed and configured with appropriate permissions

### Usage

#### For local development (deploy.sh):

- **Build the Docker image only**:

  ```bash
  ./deploy.sh --build
  ```

- **Build and run locally** (includes health check) for a specific environment:
  ```bash
  ./deploy.sh --run --env development
  ```

#### For ECR deployment (deploy-to-ecr.sh):

- **Build and push to development ECR**:

  ```bash
  ./deploy-to-ecr.sh development
  ```

- **Build and push to production ECR**:
  ```bash
  ./deploy-to-ecr.sh production
  ```

### Important Note on ECR Login Issues

The full `deploy.sh` script may have issues with the ECR login step due to string parsing problems. If you encounter errors like:

```
Logging in to AWS ECR...
"docker login" requires at most 1 argument.
```

Use the simplified `deploy-to-ecr.sh` script for pushing to ECR instead, which uses a hardcoded ECR domain to avoid these parsing problems.

### Features

- **Dynamic ECR Repository Detection**: Automatically retrieves the repository URL from CloudFormation stack outputs
- **Environment-specific configurations**: Supports different settings for development and production
- **Version Tracking**: Creates timestamped image tags for version history
- **Platform compatibility**: Builds for Linux/AMD64 to ensure AWS compatibility
- **Robust Health checks**: Multiple retry attempts with clear feedback
- **ECS Deployment Integration**: Option to update ECS service after pushing images
- **Clear status messages**: Color-coded output shows success/failure at each step
- **Error handling**: Fails gracefully with helpful error messages

## GitHub Actions Integration

For CI/CD automation, use the provided GitHub workflow file to automatically build and deploy your Docker image when changes are made to the backend code.

### Setup Instructions

1. Create a directory `.github/workflows/` in the root of your project
2. Save the workflow file as `.github/workflows/docker-deploy.yml`
3. Add AWS credentials to your GitHub repository secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

### Note About ECR Authentication

The GitHub workflow uses the official AWS actions for ECR authentication, which avoids the string parsing issues that can occur in shell scripts. This makes it more reliable for production CI/CD pipelines.

If you decide to implement your own CI/CD pipeline outside of GitHub, consider using a similar approach or using the simplified `deploy-to-ecr.sh` script that avoids string manipulation for ECR authentication.

### Features

- **Automatic triggering**: Builds on push to main/development branches
- **Path filtering**: Only triggers when backend code changes
- **Manual deployment**: Can be triggered manually for specific environments
- **Environment selection**: Automatically selects environment based on branch
- **Build caching**: Uses GitHub's cache for faster builds

## AWS ECS Integration

The GitHub workflow includes an optional step to deploy to ECS. To enable automatic deployment to ECS:

1. Uncomment the ECS deployment step in the workflow file
2. Ensure your IAM permissions allow updating ECS services
3. Verify the cluster name and service name match your AWS setup

## Complete Deployment Flow

A typical development workflow using these tools:

1. Make changes to your backend code
2. Test locally with `./deploy.sh --run --env development`
3. When ready for development deployment:
   ```bash
   ./deploy.sh --push --env development
   ```
4. For production deployment:
   ```bash
   ./deploy.sh --push --env production
   ```
5. Alternatively, push to the appropriate branch and let GitHub Actions handle deployment

The script offers optional ECS deployment integration when you push your image, making it a complete one-command deployment solution.

## Troubleshooting

If you encounter issues:

1. **ECR Repository Detection Fails**: Verify your AWS credentials and permissions

   ```bash
   aws sts get-caller-identity
   ```

2. **Health Check Fails**: View container logs

   ```bash
   docker logs backend-service
   ```

3. **ECS Deployment Issues**: Check your ECS service configuration
   ```bash
   aws ecs describe-services --cluster WnpBackendCluster-development --services wnp-backend-service-development
   ```
