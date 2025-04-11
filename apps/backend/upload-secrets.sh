#!/bin/bash

# Script to upload environment variables to AWS Secrets Manager
# Usage: ./upload-secrets.sh [development|production]

set -e

# Check if a stage parameter was provided
if [ $# -eq 0 ]; then
	echo "Usage: $0 [development|production]"
	exit 1
fi

STAGE=$1

# Validate stage parameter
if [[ "$STAGE" != "development" && "$STAGE" != "production" ]]; then
	echo "Error: Stage must be either 'development' or 'production'"
	exit 1
fi

echo "Uploading secrets for stage: $STAGE"

# Function to create or update a secret in AWS Secrets Manager
create_or_update_secret() {
	local SECRET_NAME=$1
	local SECRET_VALUE=$2
	local DESCRIPTION=$3

	# Check if the secret already exists
	if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --no-cli-pager 2>/dev/null; then
		echo "Updating existing secret: $SECRET_NAME"
		aws secretsmanager update-secret \
			--secret-id "$SECRET_NAME" \
			--secret-string "$SECRET_VALUE" \
			--description "$DESCRIPTION" \
			--no-cli-pager
	else
		echo "Creating new secret: $SECRET_NAME"
		aws secretsmanager create-secret \
			--name "$SECRET_NAME" \
			--description "$DESCRIPTION" \
			--secret-string "$SECRET_VALUE" \
			--no-cli-pager
	fi
}

# Function to convert string to lowercase using tr
to_lower() {
	echo "$1" | tr '[:upper:]' '[:lower:]'
}

# Read the .env file for the specified stage
ENV_FILE=".env.${STAGE}"

if [ ! -f "$ENV_FILE" ]; then
	echo "Error: Environment file $ENV_FILE not found"
	exit 1
fi

# Load environment variables
while IFS='=' read -r key value || [ -n "$key" ]; do
	# Skip comments and empty lines
	[[ $key == \#* ]] && continue
	[[ -z "$key" ]] && continue

	# Remove quotes and leading/trailing whitespace from value
	value=$(echo $value | sed -e 's/^"//' -e 's/"$//' -e 's/^'"'"'//' -e 's/'"'"'$//' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')

	# Create secret name with stage prefix - convert key to lowercase using tr
	key_lower=$(to_lower "$key")
	secret_name="${key_lower}-${STAGE}"
	description="Environment variable ${key} for stage ${STAGE}"

	# Skip empty values
	if [ -z "$value" ]; then
		echo "Skipping empty value for $key"
		continue
	fi

	# Create or update the secret
	create_or_update_secret "$secret_name" "$value" "$description"
done <"$ENV_FILE"

# Create specific secrets for our application with proper naming convention
VAR_VAPID_PUBLIC_KEY=$(grep "^VAPID_PUBLIC_KEY=" "$ENV_FILE" | cut -d'=' -f2-)
if [ -n "$VAR_VAPID_PUBLIC_KEY" ]; then
	create_or_update_secret "vapid-public-key-${STAGE}" "$VAR_VAPID_PUBLIC_KEY" "VAPID public key for web push notifications"
fi

VAR_VAPID_PRIVATE_KEY=$(grep "^VAPID_PRIVATE_KEY=" "$ENV_FILE" | cut -d'=' -f2-)
if [ -n "$VAR_VAPID_PRIVATE_KEY" ]; then
	create_or_update_secret "vapid-private-key-${STAGE}" "$VAR_VAPID_PRIVATE_KEY" "VAPID private key for web push notifications"
fi

VAR_WEB_PUSH_EMAIL=$(grep "^WEB_PUSH_EMAIL=" "$ENV_FILE" | cut -d'=' -f2-)
if [ -n "$VAR_WEB_PUSH_EMAIL" ]; then
	create_or_update_secret "web-push-email-${STAGE}" "$VAR_WEB_PUSH_EMAIL" "Email for web push notifications"
fi

VAR_SECRET=$(grep "^SECRET=" "$ENV_FILE" | cut -d'=' -f2-)
if [ -n "$VAR_SECRET" ]; then
	create_or_update_secret "jwt-secret-${STAGE}" "$VAR_SECRET" "Secret key for JWT token signing"
fi

VAR_DATABASE_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d'=' -f2-)
if [ -n "$VAR_DATABASE_URL" ]; then
	create_or_update_secret "database-url-${STAGE}" "$VAR_DATABASE_URL" "Database connection URL"
fi

# Add AWS credentials to secrets manager
VAR_AWS_ACCESS_KEY_ID=$(grep "^AWS_ACCESS_KEY_ID=" "$ENV_FILE" | cut -d'=' -f2-)
if [ -n "$VAR_AWS_ACCESS_KEY_ID" ]; then
	create_or_update_secret "aws-access-key-id" "$VAR_AWS_ACCESS_KEY_ID" "AWS Access Key ID for AWS SDK"
fi

VAR_AWS_SECRET_ACCESS_KEY=$(grep "^AWS_SECRET_ACCESS_KEY=" "$ENV_FILE" | cut -d'=' -f2-)
if [ -n "$VAR_AWS_SECRET_ACCESS_KEY" ]; then
	create_or_update_secret "aws-secret-access-key" "$VAR_AWS_SECRET_ACCESS_KEY" "AWS Secret Access Key for AWS SDK"
fi

echo "Secret upload completed successfully!"
