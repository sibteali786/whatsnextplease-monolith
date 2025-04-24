#!/bin/bash

# Simple script to build and deploy Docker image to ECR
# Usage: ./deploy-to-ecr.sh [development|production]

# Configuration
AWS_REGION="us-east-1"
IMAGE_NAME="backend-app"
ECR_DOMAIN="519076116465.dkr.ecr.us-east-1.amazonaws.com"

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a command was successful
check_status() {
	if [ $? -eq 0 ]; then
		echo -e "${GREEN}✓ $1${NC}"
	else
		echo -e "${RED}✗ $1${NC}"
		exit 1
	fi
}

# Determine environment
ENVIRONMENT=${1:-development}
echo -e "${YELLOW}Building and deploying for environment: $ENVIRONMENT${NC}"

# Get ECR repository URL from CloudFormation
STACK_NAME="WnpBackendStack-$ENVIRONMENT"
echo -e "${YELLOW}Getting ECR repository URL from stack: $STACK_NAME${NC}"
ECR_REPO=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
	--query "Stacks[0].Outputs[?ExportName=='ECRRepositoryURI-$ENVIRONMENT'].OutputValue" \
	--output text)

if [ -z "$ECR_REPO" ]; then
	echo -e "${RED}Error: Could not retrieve ECR repository URL${NC}"
	exit 1
fi

echo -e "${GREEN}Using ECR repository: $ECR_REPO${NC}"

# Build Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build --platform linux/amd64 -t $IMAGE_NAME -f apps/backend/Dockerfile .
check_status "Docker image build"

# Login to ECR
echo -e "${YELLOW}Logging in to AWS ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_DOMAIN
check_status "AWS ECR login"

# Tag the image
echo -e "${YELLOW}Tagging image...${NC}"
docker tag $IMAGE_NAME:latest $ECR_REPO:latest
check_status "Image tagging"

# Push to ECR
echo -e "${YELLOW}Pushing to ECR...${NC}"
docker push $ECR_REPO:latest
check_status "Image push to ECR"

# Update ECS service (optional)
read -p "Do you want to update the ECS service? (y/n): " UPDATE_SERVICE
if [[ $UPDATE_SERVICE == "y" ]]; then
	echo -e "${YELLOW}Updating ECS service...${NC}"
	aws ecs update-service \
		--cluster wnp-backend-cluster-$ENVIRONMENT \
		--service wnp-backend-service-$ENVIRONMENT \
		--force-new-deployment
	check_status "ECS service update"
fi

echo -e "${GREEN}Deployment completed successfully!${NC}"
