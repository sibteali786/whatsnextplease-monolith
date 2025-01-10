# Print the environment and git ref for debugging
echo "VERCEL_ENV: $VERCEL_ENV"
echo "VERCEL_GIT_COMMIT_REF: $VERCEL_GIT_COMMIT_REF"

# Check if we're in a production deployment
if [[ "$VERCEL_ENV" == "production" ]] ; then
    echo "🔍 Checking production deployment..."
    
    # Check if we're on main branch
    if [[ "$VERCEL_GIT_COMMIT_REF" == "main" ]] ; then
        echo "📝 On main branch, checking for changes in web app..."
        
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