# Keycloak Setup Guide (Local Development)

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Testing](#testing)
5. [Common Issues](#common-issues)

## Prerequisites

- Docker installed
- PostgreSQL running
- Node.js 18+ installed

## Installation

### 1. Start Keycloak via Docker Compose

- For details where it is visit [IdP Provider](./01-OVERVIEW.md) for Identity Provider Repo.

**File**: `docker-compose.yml` (already exists)

```bash
docker compose up -d keycloak
```

**Wait for Keycloak to start** (~30 seconds):

```bash
docker compose logs -f keycloak
# Wait for "Started 590 of 885 services"
```

### 2. Access Keycloak Admin Console

**URL**: http://localhost:8080

**Credentials**:

- Username: `admin`
- Password: `admin`

### 3. Verify Realm Setup

1. Click **"hcc-wnp"** realm (top-left dropdown)
2. Should already be configured (from realm export)

### 4. Verify Groups Exist

1. Go to **Groups** (left sidebar)
2. Should see:
   - `WnpInternalUsers`
   - `WnpExternalClients`
   - `HccUsers`

If missing, create them:

- Click **Create group**
- Enter name (e.g., `WnpInternalUsers`)
- Click **Create**

#### Issues

- There can be an issue where your backend might not be able to identify the user created because keycloak v25+ by default does not have `sub` property added to each User Group.

##### Steps

- Go to keycloak Admin at http://localhost:8080
- Go to realm `hcc-wnp`
- Go to Clients -> any client let say ( wnp-app-client-local ) -> Client Scopes -> Setup
- Then clieck on `wnp-app-client-local-dedicated` -> Mappers
- Click on `Add predefined mapper` , search for `sub`, chose and click `Add`
- This would solve the empty sub issue locally for keycloak

### 5. Verify App Client

1. Go to **Clients** → Find `wnp-app-client-local`
2. Click on it
3. Verify settings:
   - **Client authentication**: OFF
   - **Authorization**: OFF
   - **Authentication flow**:
     - ✅ Standard flow
     - ✅ Direct access grants
   - **Valid redirect URIs**: `http://localhost:3000/*`

## Configuration

### Backend Environment

**File**: `apps/backend/.env`

```bash
# Switch to Keycloak
AUTH_PROVIDER=keycloak

# Keycloak Configuration
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=hcc-wnp
KEYCLOAK_CLIENT_ID=wnp-app-client-local
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin

# Legacy JWT Secret (still needed for fallback)
SECRET=randomSecretIDonotNeed
```

### Restart Backend

```bash
cd apps/backend
npm run dev

# OR in case of pnpm monolith go to root and run
pnpm run dev
```

**Check logs** for:

```
Auth provider: keycloak
Keycloak URL: http://localhost:8080
```

## Testing

### Test 1: Create User via API

```bash
curl -X POST http://localhost:5000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "keycloak-test",
    "email": "test@hillcountrycoders.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User",
    "role": "TASK_AGENT"
  }'
```

**Expected**:

```json
{
  "success": true,
  "user": { ... },
  "token": "eyJhbGc..."
}
```

### Test 2: Verify User in Keycloak

1. Go to Keycloak Admin → **Users**
2. Search for `keycloak-test`
3. Should see user with:
   - Status: **Enabled**
   - Email verified: **Yes**
4. Click **Groups** tab → Should show `WnpInternalUsers`

### Test 3: Signin

```bash
curl -X POST http://localhost:5000/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "keycloak-test",
    "password": "TestPass123!"
  }'
```

**Expected**: Token returned successfully

## Common Issues

### Issue 1: "Connection refused" to Keycloak

**Cause**: Keycloak not running

**Fix**:

```bash
docker compose up -d keycloak
docker compose logs -f keycloak
```

### Issue 2: "Realm not found"

**Cause**: Realm not imported

**Fix**:

1. Go to Keycloak Admin Console
2. Create realm "hcc-wnp" manually
3. Or re-import realm export file

### Issue 3: "Account is not fully set up"

**Cause**: User created without required actions cleared

**Fix**: Already fixed in code with `requiredActions: []`

### Issue 4: Groups not found

**Cause**: Groups don't exist in Keycloak

**Fix**: Create groups manually (see step 4 above)

## Advanced Configuration

### Custom Realm Settings

**Password Policy**:

1. Go to **Realm Settings** → **Security defenses** → **Brute force detection**
2. Enable brute force protection

**Token Lifespan**:

1. **Realm Settings** → **Tokens**
2. Access Token Lifespan: `12 hours` (43200 seconds)

### Adding Custom Attributes

To store application role in Keycloak token:

1. **User Attributes**:
   - Go to user → **Attributes** tab
   - Add: `app_role = TASK_AGENT`

2. **Client Scope**:
   - **Client Scopes** → Create new scope
   - Add mapper to include `app_role` in token

## Next Steps

- Read [AWS Cognito Setup](./03-AWS-COGNITO-SETUP.md) for production
- Read [Migration Guide](./04-MIGRATION-GUIDE.md)
- Read [Troubleshooting](./06-TROUBLESHOOTING.md)
