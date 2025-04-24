#!/bin/bash

# Script to automate Docker build, local testing, and AWS ECR deployment

# Default configuration
AWS_REGION="us-east-1"
IMAGE_NAME="backend-app"
LOCAL_PORT=5001
CONTAINER_PORT=3000
DOCKERFILE_PATH="apps/backend/Dockerfile"
CONTAINER_NAME="backend-service"
ENVIRONMENT="development"

# Dynamically retrieve ECR repository URL from CloudFormation stack
get_ecr_repo_url() {
	local env=$1
	echo "Retrieving ECR repository URL for environment: $env"
	local repo_url=$(aws cloudformation describe-stacks --stack-name "WnpBackendStack-$env" \
		--query "Stacks[0].Outputs[?ExportName=='ECRRepositoryURI-$env'].OutputValue" \
		--output text)

	if [ -z "$repo_url" ]; then
		echo "Error: Could not retrieve ECR repository URL. Using default."
		repo_url="519076116465.dkr.ecr.us-east-1.amazonaws.com/wnp-backend-repo-$env"
	fi

	echo "$repo_url"
}

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to display usage information
usage() {
	echo "Usage: $0 [options]"
	echo "Options:"
	echo "  --build             Only build the Docker image"
	echo "  --run               Build and run the Docker image locally"
	echo "  --push              Build, run locally, and push to ECR"
	echo "  --clean             Remove local containers and images"
	echo "  --env VALUE         Specify environment (development/production)"
	echo "  --help              Display this help message"
	echo
	echo "Examples:"
	echo "  $0 --build                    Build the Docker image for development"
	echo "  $0 --run --env production     Build and run for production environment"
	echo "  $0 --push --env development   Push to development ECR repository"
	exit 1
}

# Function to check if a command was successful
check_status() {
	if [ $? -eq 0 ]; then
		echo -e "${GREEN}✓ $1${NC}"
	else
		echo -e "${RED}✗ $1${NC}"
		exit 1
	fi
}

# Function to build the Docker image
build_image() {
	echo -e "${YELLOW}Building Docker image...${NC}"
	docker build --platform linux/amd64 -t $IMAGE_NAME -f $DOCKERFILE_PATH .
	check_status "Docker image build"
}

# Function to run the Docker image locally
run_local() {
	echo -e "${YELLOW}Stopping any existing container...${NC}"
	docker stop $CONTAINER_NAME 2>/dev/null || true
	docker rm $CONTAINER_NAME 2>/dev/null || true

	# Set environment-specific variables
	if [ "$ENVIRONMENT" == "production" ]; then
		NODE_ENV="production"
		# In a real scenario, you might want to use a different database for production testing
		DB_URL="postgresql://postgres:postgres@host.docker.internal:5432/wnpdb_prod"
	else
		NODE_ENV="development"
		DB_URL="postgresql://postgres:postgres@host.docker.internal:5432/wnpdb_dev"
	fi

	echo -e "${YELLOW}Running Docker container locally for $ENVIRONMENT environment...${NC}"
	docker run -d \
		-p $LOCAL_PORT:$CONTAINER_PORT \
		--name $CONTAINER_NAME \
		-e DATABASE_URL="$DB_URL" \
		-e NODE_ENV="$NODE_ENV" \
		-e PORT="$CONTAINER_PORT" \
		$IMAGE_NAME

	check_status "Docker container started"

	# Check if the container is running properly
	echo -e "${YELLOW}Waiting for container to start...${NC}"
	sleep 5

	if docker ps | grep -q $CONTAINER_NAME; then
		echo -e "${GREEN}Container running at http://localhost:$LOCAL_PORT${NC}"

		# Check if API is responding with increasing retries
		MAX_RETRIES=5
		RETRY_COUNT=0
		HEALTH_CHECK="Failed"

		echo -e "${YELLOW}Testing API health endpoint...${NC}"

		while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
			HEALTH_CHECK=$(curl -s http://localhost:$LOCAL_PORT/health || echo "Failed")

			if [[ $HEALTH_CHECK == *"healthy"* ]]; then
				echo -e "${GREEN}✓ API health check passed on attempt $(($RETRY_COUNT + 1))${NC}"
				break
			else
				RETRY_COUNT=$((RETRY_COUNT + 1))
				if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
					echo -e "${YELLOW}Health check attempt $RETRY_COUNT failed. Retrying in 3 seconds...${NC}"
					sleep 3
				fi
			fi
		done

		if [[ $HEALTH_CHECK != *"healthy"* ]]; then
			echo -e "${RED}✗ API health check failed after $MAX_RETRIES attempts. Response: $HEALTH_CHECK${NC}"
			echo -e "${YELLOW}Container logs:${NC}"
			docker logs $CONTAINER_NAME

			read -p "Continue with ECR push despite failed health check? (y/n): " CONTINUE
			if [[ $CONTINUE != "y" ]]; then
				exit 1
			fi
		fi
	else
		echo -e "${RED}Container failed to start${NC}"
		docker logs $CONTAINER_NAME
		exit 1
	fi
}

# Function to push to AWS ECR
push_to_ecr() {
	# Check if AWS CLI is installed
	if ! command -v aws &>/dev/null; then
		echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
		exit 1
	fi

	# Check if AWS CLI is configured
	if ! aws sts get-caller-identity &>/dev/null; then
		echo -e "${RED}AWS CLI is not properly configured. Please run 'aws configure' first.${NC}"
		exit 1
	fi

	echo -e "${YELLOW}Logging in to AWS ECR...${NC}"
	# Extract the ECR domain correctly
	ECR_DOMAIN=$(echo $ECR_REPO | cut -d'/' -f1)
	aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_DOMAIN
	check_status "AWS ECR login"

	echo -e "${YELLOW}Tagging Docker image...${NC}"
	docker tag $IMAGE_NAME:latest $ECR_REPO:latest
	check_status "Docker image tagging"

	# Add timestamp tag for versioning
	TIMESTAMP=$(date +%Y%m%d%H%M%S)
	docker tag $IMAGE_NAME:latest $ECR_REPO:$TIMESTAMP
	check_status "Docker image timestamp tagging"

	echo -e "${YELLOW}Pushing latest image to ECR...${NC}"
	docker push $ECR_REPO:latest
	check_status "Docker image push to ECR (latest)"

	echo -e "${YELLOW}Pushing timestamped image to ECR...${NC}"
	docker push $ECR_REPO:$TIMESTAMP
	check_status "Docker image push to ECR (timestamped)"

	echo -e "${GREEN}Images successfully pushed to ECR:${NC}"
	echo -e "${GREEN}- $ECR_REPO:latest${NC}"
	echo -e "${GREEN}- $ECR_REPO:$TIMESTAMP${NC}"

	# Optional: Update ECS service to deploy the new image
	read -p "Do you want to update the ECS service to use this image? (y/n): " UPDATE_ECS
	if [[ $UPDATE_ECS == "y" ]]; then
		echo -e "${YELLOW}Updating ECS service...${NC}"
		aws ecs update-service \
			--cluster WnpBackendCluster-$ENVIRONMENT \
			--service wnp-backend-service-$ENVIRONMENT \
			--force-new-deployment
		check_status "ECS service update"
		echo -e "${GREEN}ECS service update initiated. Check the AWS console for deployment status.${NC}"
	fi
}

# Function to clean up resources
clean_resources() {
	echo -e "${YELLOW}Stopping and removing the container...${NC}"
	docker stop $CONTAINER_NAME 2>/dev/null || true
	docker rm $CONTAINER_NAME 2>/dev/null || true
	check_status "Container removed"

	echo -e "${YELLOW}Removing the local images...${NC}"
	docker rmi $IMAGE_NAME:latest 2>/dev/null || true
	docker rmi $ECR_REPO:latest 2>/dev/null || true

	# Check for and remove any timestamped images
	TIMESTAMPED_IMAGES=$(docker images | grep $ECR_REPO | grep -v latest | awk '{print $1":"$2}')
	if [ ! -z "$TIMESTAMPED_IMAGES" ]; then
		echo -e "${YELLOW}Removing timestamped images...${NC}"
		for img in $TIMESTAMPED_IMAGES; do
			docker rmi $img 2>/dev/null || true
		done
	fi

	# Optionally, clean up dangling images
	echo -e "${YELLOW}Cleaning up dangling images...${NC}"
	docker image prune -f 2>/dev/null || true

	check_status "Images removed"
}

# Parse command line arguments
if [ $# -eq 0 ]; then
	usage
fi

# Process options
while [[ "$#" -gt 0 ]]; do
	case $1 in
	--build)
		ACTION="build"
		;;
	--run)
		ACTION="run"
		;;
	--push)
		ACTION="push"
		;;
	--clean)
		ACTION="clean"
		;;
	--help)
		usage
		;;
	--env)
		ENVIRONMENT="$2"
		shift
		;;
	*)
		echo "Unknown option: $1"
		usage
		;;
	esac
	shift
done

# Get ECR repository URL based on environment
ECR_REPO=$(get_ecr_repo_url $ENVIRONMENT)
echo -e "${GREEN}Using ECR repository: $ECR_REPO${NC}"

# Execute the requested action
case "$ACTION" in
build)
	build_image
	;;
run)
	build_image
	run_local
	;;
push)
	build_image
	run_local
	push_to_ecr
	;;
clean)
	clean_resources
	;;
*)
	echo "No action specified"
	usage
	;;
esac

echo -e "${GREEN}Done!${NC}"
