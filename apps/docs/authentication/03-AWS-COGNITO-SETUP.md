# AWS Cognito Setup Guide (Staging/Production)

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [CDK Infrastructure](#cdk-infrastructure)
3. [IAM Permissions](#iam-permissions)
4. [Backend Configuration](#backend-configuration)
5. [Testing](#testing)
6. [Common Issues](#common-issues)

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- CDK installed: `npm install -g aws-cdk`
- Node.js 18+ installed

## CDK Infrastructure

### User Pool Configuration

The Cognito User Pool is defined in the shared authentication stack.

**File**: `Identity-provider-shared-infra/cdk/lib/shared-auth-stack.ts` (already deployed)

**Current Configuration**:

- **User Pool ID**: `us-#########Q` (staging)
- **WNP App Client ID**: `7############h0`
- **HCC App Client ID**: `5############81`
- **Domain**: `hcc-wnp-auth-staging`

### Verify Deployment

```bash
cd Identity-provider-shared-infra/cdk
cdk list

# Should show:
# SharedAuthStack-staging
```

### User Pool Settings

**Password Policy**:

- Minimum length: 8 characters
- Requires lowercase: Yes
- Requires uppercase: Yes
- Requires digits: Yes
- Requires symbols: No

**Sign-in Options**:

- Email: Yes
- Username: Yes

**Auto-verification**: Email only

### Groups Configuration

Three groups are created automatically:

1. **WnpInternalUsers**
   - For: SUPER_USER, TASK_SUPERVISOR, TASK_AGENT
   - Description: Internal users for WhatsNextPlease

2. **WnpExternalClients**
   - For: CLIENT role
   - Description: External clients for WhatsNextPlease

3. **HccUsers**
   - For: HCC Admin application users
   - Description: Users for HCC Admin application

### App Client Configuration

**WNP App Client** (`7################h0`):

- **Authentication flows**:
  - ✅ USER_PASSWORD_AUTH (enabled)
  - ✅ USER_SRP_AUTH (enabled)
- **OAuth flows**:
  - ✅ Authorization code grant
  - ❌ Implicit grant (disabled)
- **OAuth scopes**: email, openid, profile
- **Client secret**: None (public client)
- **Callback URLs**:
  - `http://localhost:3000/auth/callback`
  - `https://staging.whatsnextplease.com/auth/callback`
- **Logout URLs**:
  - `http://localhost:3000`
  - `https://staging.whatsnextplease.com`

## IAM Permissions

### Required Permissions for Backend

The IAM user/role running the backend needs these permissions:

**Create IAM Policy**: `CognitoUserManagement`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CognitoUserManagement",
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminDeleteUser",
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminInitiateAuth",
        "cognito-idp:AdminSetUserPassword",
        "cognito-idp:AdminAddUserToGroup",
        "cognito-idp:AdminRemoveUserFromGroup",
        "cognito-idp:ListUsers",
        "cognito-idp:ListUsersInGroup",
        "cognito-idp:GetUser"
      ],
      "Resource": "arn:aws:cognito-idp:us-east-1:519076116465:userpool/us-east-1_P4CzLEEQQ"
    }
  ]
}
```

### Attach Policy to IAM User

**Via AWS Console**:

1. Go to IAM → Users
2. Find your IAM user (e.g., for access key `A##########5G`)
3. Click **Add permissions** → **Attach policies directly**
4. Create and attach the policy above

**Via AWS CLI**:

```bash
# Create policy
aws iam create-policy \
  --policy-name CognitoUserManagement \
  --policy-document file://cognito-policy.json

# Attach to user
aws iam attach-user-policy \
  --user-name YOUR_IAM_USERNAME \
  --policy-arn arn:aws:iam::519076116465:policy/CognitoUserManagement
```

### Verify Permissions

```bash
# Test IAM permissions
aws cognito-idp list-users \
  --user-pool-id us-east-1_P4CzLEEQQ \
  --limit 1

# Should return users list or empty array
```

## Backend Configuration

### Environment Variables

**File**: `apps/backend/.env`

```bash
# Switch to Cognito
AUTH_PROVIDER=cognito

# AWS Cognito Configuration
COGNITO_USER_POOL_ID=u#################Q
COGNITO_CLIENT_ID=7################h0
AWS_REGION=us-east-1
COGNITO_DOMAIN=hcc-wnp-auth-staging

# AWS Credentials (ensure they have Cognito permissions)
AWS_ACCESS_KEY_ID=A##############5G
AWS_SECRET_ACCESS_KEY=YourSecretKeyHere

# Legacy JWT Secret (still needed for fallback)
SECRET=randomSecretIDonotNeed
```

### Restart Backend

```bash
cd apps/backend
npm run dev
```

**Check logs** for:

```
Auth provider: cognito
Cognito User Pool ID: u###################Q
```

## Testing

### Test 1: New User Signup via cURL

```bash
curl -X POST http://localhost:5000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "cognito-test-user",
    "email": "test@hillcountrycoders.com",
    "password": "TestPass123!",
    "firstName": "Cognito",
    "lastName": "Test",
    "role": "TASK_AGENT"
  }'
```

**Expected Response**:

```json
{
  "success": true,
  "user": {
    "id": "...",
    "username": "cognito-test-user",
    "cognitoSub": "94387478-c091-70c8-e87e-0fb01015d700"
  },
  "token": "eyJraWQi..."
}
```

**Verify in AWS Console**:

1. Go to Cognito → User Pools → `u###############Q`
2. Click **Users** tab
3. Search for `cognito-test-user`
4. User should exist with status `CONFIRMED`
5. Groups tab should show `WnpInternalUsers`

### Test 2: User Signin

```bash
curl -X POST http://localhost:5000/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "cognito-test-user",
    "password": "TestPass123!"
  }'
```

**Expected**: Valid token returned

### Test 3: Token Structure

**Decode token** (use jwt.io or):

```bash
TOKEN="your-token-here"
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq
```

**Expected Cognito Token**:

```json
{
  "sub": "94387478-c091-70c8-e87e-0fb01015d700",
  "cognito:groups": ["WnpInternalUsers"],
  "email_verified": true,
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_P4CzLEEQQ",
  "cognito:username": "cognito-test-user",
  "aud": "76ko5grdgfcroqj6pl2k66j4h0",
  "token_use": "id",
  "email": "test@hillcountrycoders.com"
}
```

### Test 4: Auto-Migration

**Login to trigger migration**:

```bash
curl -X POST http://localhost:5000/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "Cornell.Hagenes",
    "password": "Password123!@#"
  }'
```

**Expected Response**:

```json
{
  "success": true,
  "message": "Logged in successfully (account upgraded)",
  "migrated": true,
  "user": { "cognitoSub": "..." }
}
```

**Verify migration**:

```sql
SELECT username, "cognitoSub" FROM "User" WHERE username = 'old-cognito-user';
-- Should now have cognitoSub populated
```

## Common Issues

### Issue 1: "User pool client does not have secret"

**Error Message**:

```
NotAuthorizedException: Unable to verify secret hash for client
```

**Cause**: App client was created with a client secret, but code doesn't send it.

**Solution**:

1. Go to AWS Console → Cognito → User Pools
2. Select your pool → App integration → App clients
3. Edit `wnp-app-client-staging`
4. Ensure **"Don't generate a client secret"** is selected
5. Or create a new app client without secret

### Issue 2: "NotAuthorizedException: Incorrect username or password"

**Possible Causes**:

1. User doesn't exist in Cognito
2. Wrong password
3. User status is `FORCE_CHANGE_PASSWORD`

**Debug**:

```bash
# Check if user exists in Cognito
aws cognito-idp admin-get-user \
  --user-pool-id us-east-1_P4CzLEEQQ \
  --username cognito-test-user
```

**Solution for FORCE_CHANGE_PASSWORD**:

Already fixed in code:

```typescript
// CognitoAdminService.ts
Permanent: true, // Password is not temporary
```

### Issue 3: "AccessDeniedException: User is not authorized"

**Cause**: IAM credentials lack Cognito permissions

**Solution**: Add IAM policy (see [IAM Permissions](#iam-permissions) section)

**Verify**:

```bash
aws iam list-attached-user-policies --user-name YOUR_USERNAME
```

### Issue 4: Groups not showing in token

**Cause**: User not added to group, or groups not included in token

**Solution**:

1. **Verify user is in group** (AWS Console):
   - User → Groups tab → Should show group

2. **Verify group exists**:

```bash
aws cognito-idp list-groups --user-pool-id us-east-1_P4CzLEEQQ
```

3. **Check token** (should have `cognito:groups` claim)

### Issue 5: Token validation fails

**Error**: `Invalid JWT signature` or `Token expired`

**Causes**:

1. Wrong User Pool ID in validation
2. Wrong region
3. Token actually expired

**Solution**: Verify token validation config

**File**: `apps/backend/api/middleware/auth/hybrid-auth.middleware.ts`

```typescript
const issuer = `https://cognito-idp.${AWS_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`;

// Verify issuer matches token
console.log('Expected issuer:', issuer);
console.log('Token issuer:', decodedToken.iss);
```

## Production Configuration

### Environment Variables

**File**: `apps/backend/.env.production`

```bash
AUTH_PROVIDER=cognito
COGNITO_USER_POOL_ID=us-east-1_PRODUCTION_POOL_ID
COGNITO_CLIENT_ID=production-client-id
AWS_REGION=us-east-1
COGNITO_DOMAIN=hcc-wnp-auth-production

# Use production AWS credentials
AWS_ACCESS_KEY_ID=PROD_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=PROD_SECRET_KEY
```

### Production Checklist

```
[ ] Deploy Cognito User Pool via CDK
[ ] Create production app client
[ ] Set up production groups (WnpInternalUsers, WnpExternalClients, HccUsers)
[ ] Configure callback URLs for production domain
[ ] Set up IAM permissions for production
[ ] Update backend .env.production
[ ] Test signup/signin with production Cognito
[ ] Monitor CloudWatch logs
[ ] Set up alarms for auth failures
```

### Monitoring

**CloudWatch Logs**:

- Log group: `/aws/cognito/userpools/us-east-1_P4CzLEEQQ`
- Track: SignUp, SignIn, TokenRefresh events

**Metrics to monitor**:

- `UserCreationCount`
- `SignInSuccesses`
- `SignInThrottles`
- `TokenRefreshSuccesses`

## Next Steps

- Read [Migration Guide](./04-MIGRATION-GUIDE.md) for auto-migration details
- Read [Token Validation](./05-TOKEN-VALIDATION.md) for token structure
- Read [Troubleshooting](./06-TROUBLESHOOTING.md) for common issues
