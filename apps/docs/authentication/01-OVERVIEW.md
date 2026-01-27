# Authentication System Overview

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Authentication Flow](#authentication-flow)
5. [Migration Strategy](#migration-strategy)

## Introduction

WhatsNextPlease uses a hybrid authentication system that supports:

- **Legacy JWT** (backwards compatibility)
- **Keycloak** (local development)
- **AWS Cognito** (staging/production)

This allows seamless migration from the old system to modern IDP solutions.

## Architecture

```
┌─────────────┐
│   Frontend  │
│  (Next.js)  │
└──────┬──────┘
       │ POST /auth/signup
       │ POST /auth/signin
       ↓
┌─────────────────────────────┐
│      Backend (Express)      │
│  ┌─────────────────────┐   │
│  │  Auth Controller    │   │
│  └──────┬──────────────┘   │
│         │                   │
│         ↓                   │
│  ┌─────────────────────┐   │
│  │   Auth Service      │   │
│  │  - Auto-migration   │   │
│  │  - Token exchange   │   │
│  └──────┬──────────────┘   │
│         │                   │
│    ┌────┴────┐             │
│    ↓         ↓             │
│  ┌────┐  ┌────────┐        │
│  │IDP │  │Legacy  │        │
│  │Svc │  │JWT     │        │
│  └─┬──┘  └────────┘        │
└────┼──────────────────────┘
     │
     ↓
┌─────────────┐     ┌──────────────┐
│  Keycloak   │  or │ AWS Cognito  │
│   (Local)   │     │(Staging/Prod)│
└─────────────┘     └──────────────┘
```

## Components

### 1. **Auth Controller** (`auth.controller.ts`)

- Handles HTTP requests for signup/signin
- Input validation
- Response formatting

### 2. **Auth Service** (`auth.service.ts`)

- Business logic for authentication
- Auto-migration coordination
- Token generation

### 3. **IDP Admin Service** (Factory Pattern)

- `KeycloakAdminService.ts` - Keycloak user management
- `CognitoAdminService.ts` - Cognito user management
- `IdpAdminFactory.ts` - Returns correct service based on `AUTH_PROVIDER`

### 4. **Token Exchange Service**

- Gets IDP tokens using username/password
- Handles both Keycloak and Cognito flows
- Falls back to legacy JWT on failure

### 5. **Auth Middleware** (`auth.middleware.ts`)

- Validates tokens on protected routes
- Extracts user info from tokens
- Handles both IDP and legacy JWT tokens

### 6. **Frontend Integration**

- Server actions (`auth.ts`)
- Signin/Signup components
- Middleware for route protection

## Authentication Flow

### New User Signup

```
1. User fills signup form
2. Frontend validates input
3. POST /auth/signup to backend
4. Backend creates user in database
5. Backend creates user in IDP (Keycloak/Cognito)
6. Backend gets IDP token
7. Token returned to frontend
8. Cookie set with token
9. User redirected to /home
```

### Existing User Signin (With cognitoSub)

```
1. User enters credentials
2. POST /auth/signin to backend
3. Backend finds user in database
4. User has cognitoSub → migrated
5. Backend gets IDP token
6. Token returned
7. User logged in
```

### Old User Signin (No cognitoSub) - Auto-Migration

```
1. User enters credentials
2. POST /auth/signin
3. Backend finds user in database
4. User has NO cognitoSub → needs migration
5. Backend verifies password (bcrypt)
6. Backend creates user in IDP
7. Backend updates database with cognitoSub
8. Backend gets IDP token
9. Token returned with migrated: true
10. User logged in seamlessly
```

## Migration Strategy

### Three-Phase Approach

**Phase 1: Coexistence** (Current)

- New users → IDP
- Old users → Legacy JWT
- Gradual auto-migration on signin

**Phase 2: Active Migration**

- Bulk migrate remaining users
- Monitor migration success rate
- Handle edge cases

**Phase 3: IDP Only**

- Disable legacy JWT
- All authentication via IDP
- Remove legacy code

### User States

| cognitoSub | Can Signin | Uses                           |
| ---------- | ---------- | ------------------------------ |
| `NULL`     | ✅ Yes     | Legacy JWT, migrates on signin |
| `<uuid>`   | ✅ Yes     | IDP token                      |

## Security Considerations

1. **Password Hashing**: bcrypt with salt rounds = 10
2. **Token Expiry**: 12 hours for both legacy and IDP
3. **httpOnly Cookies**: Prevents XSS attacks
4. **CORS**: Restricted to allowed origins
5. **Rate Limiting**: TODO (add before production)

## Environment Variables

### Required for All Environments

```bash
AUTH_PROVIDER=keycloak|cognito
SECRET=your-jwt-secret
```

### Keycloak (Local)

```bash
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=hcc-wnp
KEYCLOAK_CLIENT_ID=wnp-app-client-local
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin
```

### AWS Cognito (Staging/Prod)

```bash
COGNITO_USER_POOL_ID=us-#########Q
COGNITO_CLIENT_ID=7##################h0
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## Next Steps

- Read [Keycloak Setup](./02-KEYCLOAK-SETUP.md) for local development
- Read [AWS Cognito Setup](./03-AWS-COGNITO-SETUP.md) for staging/production
- Read [Migration Guide](./04-MIGRATION-GUIDE.md) for migration details
