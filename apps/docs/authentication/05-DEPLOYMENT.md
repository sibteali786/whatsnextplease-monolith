# Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [GitHub Actions CI/CD](#github-actions-cicd)
3. [Docker Build Process](#docker-build-process)
4. [AWS ECS Deployment](#aws-ecs-deployment)
5. [Environment Variables Strategy](#environment-variables-strategy)
6. [Vercel Deployment (Frontend)](#vercel-deployment-frontend)
7. [Common Issues](#common-issues)

---

## Overview

WhatsNextPlease uses a multi-environment deployment strategy:

| Environment    | Backend        | Frontend  | IDP               |
| -------------- | -------------- | --------- | ----------------- |
| **Local**      | Port 5000/5001 | Port 3000 | Keycloak (Docker) |
| **Staging**    | ECS Fargate    | Vercel    | AWS Cognito       |
| **Production** | ECS Fargate    | Vercel    | AWS Cognito       |

### Deployment Flow

```
┌─────────────┐
│   Push to   │
│   GitHub    │
└──────┬──────┘
       │
       ├─── staging branch
       │    │
       │    ↓
       │  ┌────────────────────────┐
       │  │ GitHub Actions         │
       │  │ - Run migrations       │
       │  │ - Build Docker image   │
       │  │ - Push to ECR          │
       │  │ - Deploy to ECS        │
       │  └────────────────────────┘
       │
       └─── main branch
            │
            ↓
          ┌────────────────────────┐
          │ GitHub Actions         │
          │ - Run migrations       │
          │ - Build Docker image   │
          │ - Push to ECR          │
          │ - Deploy to ECS        │
          └────────────────────────┘
```

---

## GitHub Actions CI/CD

### Workflow Files

**Location**: `.github/workflows/`

1. **`deploy-staging.yml`** - Deploys to staging (development stack)
2. **`deploy-production.yml`** - Deploys to production

### Staging Deployment

**Trigger**: Push to `staging` branch

**File**: `.github/workflows/deploy-staging.yml`

**Steps**:

1. **Run Database Migrations**
   - Backend migrations: `apps/backend/prisma/migrations`
   - Frontend migrations: `apps/web/prisma/migrations`

2. **Build Docker Image**
   - Context: Repository root
   - Dockerfile: `apps/backend/Dockerfile`
   - Build args: `NODE_ENV=development`
   - Secrets: `GITHUB_TOKEN` (for private npm packages)

3. **Push to ECR**
   - Tags: `latest`, `$GITHUB_SHA`, `staging-$BUILD_NUMBER`

4. **Deploy to ECS**
   - Cluster: `wnp-backend-cluster-development`
   - Service: `wnp-backend-service-development`
   - Force new deployment

5. **Wait for Stabilization**
   - Timeout: 15 minutes
   - Health checks must pass

### Production Deployment

**Trigger**: Push to `main` branch

**File**: `.github/workflows/deploy-production.yml`

**Differences from staging**:

- Uses production secrets
- Tags: `latest`, `$GITHUB_SHA`, `production-$BUILD_NUMBER`, `v$BUILD_NUMBER`
- Deploys to production ECS cluster/service

### GitHub Secrets Required

Configure these in: Repository → Settings → Secrets and variables → Actions

**AWS Credentials**:

```
AWS_ACCESS_KEY_ID=AKIAXRW2Y67YWFXCKP5G
AWS_SECRET_ACCESS_KEY=YourSecretKeyHere
```

**Database URLs**:

```
DATABASE_URL_STAGING=postgres://...
DATABASE_URL=postgres://... (production)
```

**Environment Files**:

```
ENV_DEVELOPMENT=<entire .env file for staging>
ENV_PRODUCTION=<entire .env file for production>
```

**GitHub Packages Token**:

```
GH_PACKAGES_TOKEN=ghp_YourPersonalAccessToken
```

> ⚠️ **Important**: `secrets.GITHUB_TOKEN` (built-in) does NOT work for GitHub Packages in other repositories. You MUST use a Personal Access Token (PAT) with `read:packages` scope.

---

## Docker Build Process

### Multi-Stage Build

**File**: `apps/backend/Dockerfile`

#### Stage 1: Builder

```dockerfile
FROM node:20-alpine AS builder

# Install build tools
RUN apk add --no-cache libc6-compat python3 make g++ openssl openssl-dev bash
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Install dependencies with GitHub token secret mount
RUN --mount=type=secret,id=GITHUB_TOKEN \
    echo "@HillCountryCoder:registry=https://npm.pkg.github.com" > .npmrc && \
    echo "//npm.pkg.github.com/:_authToken=$(cat /run/secrets/GITHUB_TOKEN)" >> .npmrc && \
    pnpm install --frozen-lockfile && \
    rm -f .npmrc

# Build packages and backend
RUN pnpm build
```

#### Stage 2: Production Runner

```dockerfile
FROM node:20-alpine AS runner

# Copy built artifacts from builder
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

# Install production dependencies with GitHub token
RUN --mount=type=secret,id=GITHUB_TOKEN \
    pnpm install --frozen-lockfile --prod --ignore-scripts && \
    rm -f .npmrc

# Start application
CMD ["node", "dist/index.js"]
```

### GitHub Packages Authentication

**Problem**: The `@HillCountryCoder/auth-client` package is private and requires authentication.

**Solution**: Use Docker secret mounts (not build args)

**Why secret mounts?**:

- ✅ Secrets not stored in image layers
- ✅ Secrets not visible in `docker history`
- ✅ More secure than `ARG`

**Usage in GitHub Actions**:

```yaml
- name: Build Docker image
  uses: docker/build-push-action@v5
  with:
    secrets: |
      GITHUB_TOKEN=${{ secrets.GH_PACKAGES_TOKEN }}
```

**Local testing**:

```bash
# Create token file
echo "ghp_YourToken" > /tmp/github_token.txt

# Build with secret mount
DOCKER_BUILDKIT=1 docker build \
  --secret id=GITHUB_TOKEN,src=/tmp/github_token.txt \
  -f apps/backend/Dockerfile \
  -t wnp-backend:test \
  .

# Clean up
rm /tmp/github_token.txt
```

### .env File Handling

**Important**: The `.env` file is copied into the Docker image during build but **ignored by ECS**.

```dockerfile
# This copies .env to the image
COPY apps/backend/.env* ./apps/backend/
```

**However**: ECS sets environment variables via the Task Definition (defined in CDK), which **overrides** the `.env` file.

**Best practice**: Keep `.env` in Docker for local testing only. All staging/production config comes from CDK.

---

## AWS ECS Deployment

### Infrastructure (CDK)

**File**: `apps/backend/cdk/lib/stacks/backend-stack.ts`

### Task Definition

**CPU**: 256 (0.25 vCPU)
**Memory**: 512 MB
**Networking**: Public subnet with public IP (for NAT-less architecture)

### Environment Variables

Environment variables are set in **two places**:

#### 1. Non-Secret Variables (CDK `environment`)

```typescript
environment: {
  NODE_ENV: props.stage,
  PORT: '3000',

  // AWS Configuration
  AWS_REGION: 'us-east-1',
  S3_BUCKET_NAME: this.s3Bucket.bucketName,
  CLOUDFRONT_DOMAIN: this.cloudFrontDistribution.distributionDomainName,

  // Authentication
  AUTH_PROVIDER: 'cognito',
  COGNITO_DOMAIN: 'hcc-wnp-auth-staging',

  // Email
  EMAIL_PROVIDER: 'resend',
  USE_AWS_SES: 'true',
  EMAIL_WHITELIST: '*@hillcountrycoders.com',

  // SES
  SES_FROM_EMAIL: 'noreply@whatnextplease.com',
  SES_CONFIGURATION_SET: configurationSet.configurationSetName,
}
```

#### 2. Secret Variables (CDK `secrets`)

```typescript
secrets: {
  DATABASE_URL: ecs.Secret.fromSecretsManager(databaseSecret),
  COGNITO_USER_POOL_ID: ecs.Secret.fromSecretsManager(cognitoUserPoolIdSecret),
  COGNITO_CLIENT_ID: ecs.Secret.fromSecretsManager(cognitoClientIdSecret),
  RESEND_API_KEY: ecs.Secret.fromSecretsManager(resendApiKeySecret),
  VAPID_PUBLIC_KEY: ecs.Secret.fromSecretsManager(vapidPublicKeySecret),
  VAPID_PRIVATE_KEY: ecs.Secret.fromSecretsManager(vapidPrivateKeySecret),
}
```

### Creating AWS Secrets

**Required secrets** (staging):

```bash
# Authentication
aws secretsmanager create-secret \
  --name cognito-user-pool-id-development \
  --secret-string "us-east-1_yLY6ZmDsD" \
  --region us-east-1

aws secretsmanager create-secret \
  --name cognito-client-id-development \
  --secret-string "38mj4mekgaqtg4pvhh3h2gn7cp" \
  --region us-east-1
```

**Naming convention**: `{secret-name}-{environment}`

### IAM Permissions

ECS Task Role needs:

1. **S3 Access**:

```json
{
  "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
  "Resource": ["arn:aws:s3:::wnp-media-*/*"]
}
```

2. **SES Access**:

```json
{
  "Action": ["ses:SendEmail", "ses:SendRawEmail"],
  "Resource": ["arn:aws:ses:us-east-1:*:identity/whatnextplease.com"]
}
```

3. **Cognito Access**:

```json
{
  "Action": [
    "cognito-idp:AdminCreateUser",
    "cognito-idp:AdminGetUser",
    "cognito-idp:AdminInitiateAuth",
    "cognito-idp:AdminSetUserPassword",
    "cognito-idp:AdminAddUserToGroup"
  ],
  "Resource": ["arn:aws:cognito-idp:us-east-1:*:userpool/us-east-1_yLY6ZmDsD"]
}
```

### Deploying CDK Changes

```bash
cd apps/backend/cdk

# List stacks
cdk list

# Deploy staging
cdk deploy WnpBackendStack-development

# Deploy production
cdk deploy WnpBackendStack-production
```

### Force New Deployment

After deploying CDK changes or pushing new Docker image:

```bash
# Staging
aws ecs update-service \
  --cluster wnp-backend-cluster-development \
  --service wnp-backend-service-development \
  --force-new-deployment \
  --region us-east-1

# Production
aws ecs update-service \
  --cluster wnp-backend-cluster-production \
  --service wnp-backend-service-production \
  --force-new-deployment \
  --region us-east-1
```

### Monitoring Deployment

```bash
# Watch service events
aws ecs describe-services \
  --cluster wnp-backend-cluster-development \
  --services wnp-backend-service-development \
  --query 'services[0].events[0:5]' \
  --output table

# Check task status
aws ecs list-tasks \
  --cluster wnp-backend-cluster-development \
  --service-name wnp-backend-service-development

# View logs
aws logs tail /aws/ecs/wnp-backend --follow
```

---

## Environment Variables Strategy

### The Problem

**Docker `.env` files are ignored by ECS!**

```dockerfile
# This copies .env to the image
COPY apps/backend/.env* ./apps/backend/

# But ECS IGNORES IT and uses Task Definition instead!
```

### The Solution

**All environment variables must be defined in CDK**, not in `.env`.

### Variable Categories

#### 1. **Build-time only** (Docker build)

Variables needed during `npm install` or `pnpm build`:

- `NODE_ENV`
- GitHub token (via secret mount)

#### 2. **Runtime from CDK** (ECS Task Definition)

Variables needed when the app runs:

**Non-secrets** → CDK `environment`:

```typescript
environment: {
  AUTH_PROVIDER: 'cognito',
  EMAIL_PROVIDER: 'resend',
  SES_FROM_EMAIL: 'noreply@whatnextplease.com',
}
```

**Secrets** → CDK `secrets` + AWS Secrets Manager:

```typescript
secrets: {
  COGNITO_USER_POOL_ID: ecs.Secret.fromSecretsManager(...),
  DATABASE_URL: ecs.Secret.fromSecretsManager(...),
}
```

#### 3. **Local development only** (`.env`)

Variables used when running locally:

```bash
# Local only
AUTH_PROVIDER=keycloak
KEYCLOAK_URL=http://localhost:8080
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/wnpdb_dev
```

### Checklist: Adding New Environment Variable

When adding a new environment variable:

```
[ ] Add to apps/backend/.env (for local development)
[ ] Add to backend-stack.ts environment{} OR secrets{} (for ECS)
[ ] If secret: Create in AWS Secrets Manager
[ ] If secret: Add secret reference in CDK
[ ] Update environment.ts validation schema (zod)
[ ] Deploy CDK changes
[ ] Force new ECS deployment
[ ] Verify in ECS Task Definition
```

### Verifying Environment Variables in ECS

```bash
# Get task ARN
TASK_ARN=$(aws ecs list-tasks \
  --cluster wnp-backend-cluster-development \
  --service-name wnp-backend-service-development \
  --query 'taskArns[0]' \
  --output text)

# View environment variables
aws ecs describe-tasks \
  --cluster wnp-backend-cluster-development \
  --tasks $TASK_ARN \
  --query 'tasks[0].containers[0].environment' \
  --output table

# View secrets (ARNs only, not values)
aws ecs describe-tasks \
  --cluster wnp-backend-cluster-development \
  --tasks $TASK_ARN \
  --query 'tasks[0].containers[0].secrets' \
  --output table
```

---

## Vercel Deployment (Frontend)

### The Problem

Vercel runs `pnpm install` for the **entire monorepo**, which includes the backend package that depends on `@HillCountryCoder/auth-client`.

**Error**:

```
ERR_PNPM_FETCH_401 GET https://npm.pkg.github.com/@HillCountryCoder/auth-client: Unauthorized
```

### Solution 1: GitHub Token in Vercel (Recommended for Full Install)

#### Step 1: Add Environment Variable

**Vercel Dashboard** → Project → Settings → Environment Variables

Add:

- **Name**: `NPM_TOKEN`
- **Value**: Your GitHub Personal Access Token (e.g., `ghp_...`)
- **Environments**: All (Production, Preview, Development)

#### Step 2: Update .npmrc

**File**: `.npmrc` (root)

```
@HillCountryCoder:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

Vercel automatically replaces `${NPM_TOKEN}` during build.

### Solution 2: Filter Install (Recommended for Monorepo)

Only install packages needed for frontend, skipping backend.

#### Step 1: Configure Vercel Build Settings

**Vercel Dashboard** → Project → Settings → Build & Development Settings

**Install Command**:

```bash
pnpm install --filter=web --filter=@wnp/types --filter=@wnp/logger --filter=cdk
```

**Build Command**:

```bash
cd ../.. && turbo run build --filter=web
```

**Root Directory**: `apps/web`
**Include files outside root**: ✅ Enabled

### Solution 3: Separate Workspace Config (Alternative)

Create a Vercel-specific workspace config that excludes backend.

**File**: `pnpm-workspace.vercel.yaml`

```yaml
packages:
  - 'apps/web'
  - 'packages/*'
  # Exclude backend
```

**Vercel Install Command**:

```bash
cp pnpm-workspace.vercel.yaml pnpm-workspace.yaml && pnpm install
```

### Recommended Approach

**Use Solution 2 (Filter Install)** because:

- ✅ No secrets needed in Vercel
- ✅ Faster builds (fewer dependencies)
- ✅ Clear separation of concerns
- ✅ Reduces attack surface

---

## Common Issues

### Issue 1: "Package @HillCountryCoder/auth-client not found" in GitHub Actions

**Cause**: `secrets.GITHUB_TOKEN` doesn't have access to packages in other repos.

**Solution**: Use a Personal Access Token instead.

1. Generate PAT with `read:packages` + `repo` scopes
2. Add as repository secret: `GH_PACKAGES_TOKEN`
3. Update workflow:

```yaml
secrets: |
  GITHUB_TOKEN=${{ secrets.GH_PACKAGES_TOKEN }}
```

### Issue 2: "401 Unathorized while installing @HillCountryCoder/auth-client in github actions"

**Cause**: Missing or incorrect GitHub Packages authentication or wrong PAT (Personal Access Token).

**Solution**:

- Use a PAT with `read:packages` scope and add it as a secret in GitHub Actions
- Also in Hill Country Coders organization add whatsnextplease repo to the list of repos that can access the package
- Visit the package settings in auth-client package tab and chosing whatsnextplease as Write access package.

### Issue 3: Environment Variable Not Available in ECS

**Symptoms**:

- Variable is in `.env` file
- Variable works locally
- Variable missing in ECS container

**Cause**: ECS doesn't read `.env` files.

**Solution**: Add variable to CDK `backend-stack.ts`:

```typescript
environment: {
  YOUR_NEW_VARIABLE: 'value',
}
```

Then redeploy CDK and force new ECS deployment.

### Issue 4: Vercel Build Fails with 403 for GitHub Package

**Cause**: Vercel doesn't have GitHub Packages authentication.

**Solution**: Use filtered install (Solution 2 above) or add `NPM_TOKEN` to Vercel.

### Issue 5: Docker Build Fails Locally with "secret not found"

**Cause**: Forgot to enable BuildKit or provide secret file.

**Solution**:

```bash
# Must use DOCKER_BUILDKIT=1
DOCKER_BUILDKIT=1 docker build \
  --secret id=GITHUB_TOKEN,src=/path/to/token/file \
  ...
```

### Issue 6: ECS Task Fails Health Check

**Check logs**:

```bash
aws logs tail /aws/ecs/wnp-backend --follow --since 10m
```

**Common causes**:

1. Database connection failed (check `DATABASE_URL`)
2. Missing environment variable (check Task Definition)
3. Port mismatch (ensure `PORT=3000`)
4. Application crash on startup

### Issue 7: Migration Fails but GitHub Actions Succeeds

**Cause**: Workflow doesn't check migration exit codes properly.

**Solution**: Already fixed in workflow:

```yaml
- name: Run backend migrations
  working-directory: ./apps/backend
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL_STAGING }}
```

If this step fails, the workflow stops.

---

## Deployment Checklist

### Pre-Deployment

```
[ ] All tests passing locally
[ ] Database migrations created
[ ] CDK changes deployed (if any)
[ ] AWS Secrets created/updated (if needed)
[ ] GitHub secrets updated (if needed)
[ ] Reviewed code changes
```

### Staging Deployment

```
[ ] Merge to staging branch
[ ] Monitor GitHub Actions workflow
[ ] Wait for ECS service to stabilize
[ ] Check CloudWatch logs for errors
[ ] Test staging API endpoints
[ ] Verify authentication works
[ ] Test critical user flows
```

### Production Deployment

```
[ ] Staging fully tested
[ ] Create production secrets (if new)
[ ] Merge staging to main branch
[ ] Monitor GitHub Actions workflow
[ ] Wait for ECS service to stabilize
[ ] Check CloudWatch logs
[ ] Test production API endpoints
[ ] Monitor error rates
[ ] Verify no regressions
[ ] Notify team of deployment
```

---

## Next Steps

- Read [Troubleshooting Guide](./06-TROUBLESHOOTING.md) for common issues
- Read [Monitoring Guide](./07-MONITORING.md) for production monitoring
- Read [Rollback Procedures](./08-ROLLBACK.md) for incident response
