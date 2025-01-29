# Print the environment and git ref for debugging
echo "VERCEL_ENV: $VERCEL_ENV"
echo "VERCEL_GIT_COMMIT_REF: $VERCEL_GIT_COMMIT_REF"

# Function to check for migration changes
check_migrations() {
	# Check for changes in migration files
	git diff HEAD^ HEAD --name-only | grep -E 'apps/(web|backend)/prisma/migrations/'
	return $?
}

# Check if we're in a production deployment
if [[ "$VERCEL_ENV" == "production" ]]; then
	echo "🔍 Checking production deployment..."

	# Check if we're on main branch
	if [[ "$VERCEL_GIT_COMMIT_REF" == "main" ]]; then
		echo "📝 On main branch, checking for changes..."

		# First check for migration changes
		if check_migrations; then
			echo "🔄 Migration changes detected, waiting for migration workflow..."
			# Exit with 0 to prevent build until migrations are done
			exit 0
		fi

		# Check for changes in apps/web directory
		git diff HEAD^ HEAD --quiet .

		# $? is the exit status of the last command
		if [ $? -eq 0 ]; then
			echo "🛑 No changes in web app, skipping build"
			exit 0
		else
			echo "✅ Changes detected in web app, proceeding with build"
			exit 1
		fi
	else
		echo "🛑 Not on main branch, skipping build"
		exit 0
	fi
else
	# For preview deployments (non-production)
	echo "🔍 Preview deployment..."

	# Check for migration changes in preview too
	if check_migrations; then
		echo "🔄 Migration changes detected in preview, waiting for migration workflow..."
		exit 0
	fi

	# Check for changes in apps/web directory
	git diff HEAD^ HEAD --quiet .

	if [ $? -eq 0 ]; then
		echo "🛑 No changes in web app, skipping build"
		exit 0
	else
		echo "✅ Changes detected in web app, proceeding with build"
		exit 1
	fi
fi
