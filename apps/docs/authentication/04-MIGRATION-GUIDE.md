# Auto-Migration System Guide

## Table of Contents

1. [Overview](#overview)
2. [Migration Flow](#migration-flow)
3. [Implementation Details](#implementation-details)
4. [User States](#user-states)
5. [Rollback Scenarios](#rollback-scenarios)
6. [Monitoring](#monitoring)

## Overview

The auto-migration system seamlessly upgrades users from legacy JWT authentication to modern IDP (Keycloak/Cognito) without requiring manual intervention.

### Key Principles

1. **Zero Downtime**: Users can continue logging in during migration
2. **Transparent**: Users don't need to take any action
3. **Safe**: Includes rollback mechanisms for failures
4. **Gradual**: Users migrate when they next login

## Migration Flow

### New User (No Migration Needed)

```
┌─────────────────┐
│  User Signup    │
└────────┬────────┘
         │
         ↓
┌─────────────────────────┐
│ Create in Database      │
│ - Generate UUID         │
│ - Hash password         │
│ - Set cognitoSub = NULL │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│ Create in IDP           │
│ - Keycloak/Cognito      │
│ - Assign groups         │
│ - Get IDP UUID (sub)    │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│ Update Database         │
│ SET cognitoSub = sub    │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│ Get IDP Token           │
│ Return to user          │
└─────────────────────────┘
```

**Result**: User has `cognitoSub` from the start

---

### Existing User (Auto-Migration)

```
┌─────────────────┐
│  User Signin    │
│  (Old User)     │
└────────┬────────┘
         │
         ↓
┌─────────────────────────┐
│ Find User in Database   │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│ Check cognitoSub        │
│ cognitoSub === NULL?    │
└────────┬────────────────┘
         │
         ├─── YES (Needs Migration)
         │    │
         │    ↓
         │  ┌──────────────────────────┐
         │  │ Verify Password (bcrypt) │
         │  └──────────┬───────────────┘
         │             │
         │             ↓
         │  ┌──────────────────────────┐
         │  │ Create User in IDP       │
         │  │ - Same username/email    │
         │  │ - Use verified password  │
         │  │ - Assign groups          │
         │  └──────────┬───────────────┘
         │             │
         │             ↓
         │  ┌──────────────────────────┐
         │  │ Update Database          │
         │  │ SET cognitoSub = sub     │
         │  └──────────┬───────────────┘
         │             │
         │             ↓
         │  ┌──────────────────────────┐
         │  │ Get IDP Token            │
         │  │ Return with:             │
         │  │ - migrated: true         │
         │  │ - message: "upgraded"    │
         │  └──────────────────────────┘
         │
         └─── NO (Already Migrated)
              │
              ↓
           ┌──────────────────────────┐
           │ Get IDP Token            │
           │ Return with:             │
           │ - migrated: false        │
           └──────────────────────────┘
```

**Result**: User seamlessly upgraded, next login uses IDP

---

## Implementation Details

### Backend Service

**File**: `apps/backend/api/services/auth.service.ts`

**Key Functions**:

1. **`signin()`** - Main entry point
2. **`migrateUserToIdp()`** - Migration logic
3. **Rollback on failure** - Delete IDP user if database update fails

### Migration Logic

```typescript
// Check if user needs migration
if (!entity.cognitoSub) {
  logger.info(`User ${username} needs migration to IDP`);

  // Verify password first (important!)
  const passwordValid = await bcrypt.compare(password, entity.passwordHash);
  if (!passwordValid) {
    return { success: false, message: 'Invalid credentials' };
  }

  // Migrate to IDP
  const migrationResult = await this.migrateUserToIdp(entity, password, entityType);

  if (!migrationResult.success) {
    // Migration failed, use legacy JWT fallback
    logger.warn(`Migration failed for ${username}, using legacy JWT`);
    return this.generateLegacyToken(entity, entityType);
  }

  // Migration successful
  entity.cognitoSub = migrationResult.cognitoSub;
  migrated = true;
}
```

### Atomic Migration

**Migration is atomic** - either fully succeeds or fully rolls back:

```typescript
async migrateUserToIdp(entity, password, entityType) {
  let idpUserId: string | undefined;

  try {
    // Step 1: Create user in IDP
    const createResult = await idpAdmin.createUser({
      username: entity.username,
      email: entity.email,
      firstName: entityType === 'user' ? entity.firstName : entity.contactName,
      lastName: entityType === 'user' ? entity.lastName : '',
      password,
      groups: [idpGroups],
    });

    if (!createResult.success) {
      return { success: false, error: createResult.error };
    }

    idpUserId = createResult.sub;

    // Step 2: Update database
    if (entityType === 'user') {
      await prisma.user.update({
        where: { id: entity.id },
        data: { cognitoSub: idpUserId },
      });
    } else {
      await prisma.client.update({
        where: { id: entity.id },
        data: { cognitoSub: idpUserId },
      });
    }

    logger.info(`✅ Migrated ${entityType} ${entity.username} to IDP`);
    return { success: true, cognitoSub: idpUserId };

  } catch (error) {
    // ROLLBACK: Delete IDP user if database update failed
    if (idpUserId) {
      logger.warn(`Rolling back IDP user creation for ${entity.username}`);
      await idpAdmin.deleteUser(idpUserId);
    }

    logger.error(`Migration failed for ${entity.username}:`, error);
    return { success: false, error: error.message };
  }
}
```

**Guarantees**:

- ✅ If IDP creation fails → database unchanged
- ✅ If database update fails → IDP user deleted
- ✅ Never create orphaned IDP users
- ✅ Never leave database in inconsistent state

---

## User States

### State Diagram

```
┌───────────────────────────────────────┐
│         UNMIGRATED USER               │
│  - cognitoSub = NULL                  │
│  - Has passwordHash                   │
│  - Uses legacy JWT                    │
└────────────┬──────────────────────────┘
             │
             │ First signin after
             │ AUTH_PROVIDER changed
             ↓
┌───────────────────────────────────────┐
│      MIGRATING (Transient)            │
│  - Password verified                  │
│  - IDP user being created             │
│  - Database being updated             │
└────────────┬──────────────────────────┘
             │
             ├──── Success
             │     │
             │     ↓
             │  ┌─────────────────────────┐
             │  │   MIGRATED USER         │
             │  │ - cognitoSub = UUID     │
             │  │ - Has passwordHash      │
             │  │ - Uses IDP token        │
             │  └─────────────────────────┘
             │
             └──── Failure
                   │
                   ↓
                ┌─────────────────────────┐
                │ FALLBACK TO LEGACY      │
                │ - cognitoSub = NULL     │
                │ - Uses legacy JWT       │
                │ - Can retry next login  │
                └─────────────────────────┘
```

### Database States

**Unmigrated User**:

```sql
SELECT id, username, "cognitoSub" FROM "User" WHERE username = 'olduser';

-- Result:
-- id: uuid-1234
-- username: olduser
-- cognitoSub: NULL
```

**Migrated User**:

```sql
SELECT id, username, "cognitoSub" FROM "User" WHERE username = 'olduser';

-- Result:
-- id: uuid-1234
-- username: olduser
-- cognitoSub: cognito-uuid-5678
```

---

## Rollback Scenarios

### Scenario 1: IDP User Creation Fails

**What happens**:

```typescript
// Step 1: Try to create IDP user
const createResult = await idpAdmin.createUser(...);
// FAILS: Network error, IDP down, duplicate username, etc.

if (!createResult.success) {
  // No cleanup needed - IDP user wasn't created
  return { success: false, error: createResult.error };
}
```

**Outcome**:

- ❌ IDP user not created
- ✅ Database unchanged
- ✅ User can signin with legacy JWT
- ✅ Can retry migration on next signin

---

### Scenario 2: Database Update Fails

**What happens**:

```typescript
// Step 1: IDP user created successfully
idpUserId = createResult.sub; // "cognito-uuid-5678"

// Step 2: Try to update database
await prisma.user.update({
  where: { id: entity.id },
  data: { cognitoSub: idpUserId },
});
// FAILS: Database connection lost, constraint violation, etc.

// ROLLBACK: Delete IDP user
await idpAdmin.deleteUser(idpUserId);
logger.warn(`Rolled back IDP user creation`);

return { success: false, error: error.message };
```

**Outcome**:

- ✅ IDP user deleted (rollback successful)
- ✅ Database unchanged
- ✅ User can signin with legacy JWT
- ✅ Can retry migration on next signin

---

### Scenario 3: Token Exchange Fails After Migration

**What happens**:

```typescript
// Migration successful
entity.cognitoSub = migrationResult.cognitoSub;

// Try to get IDP token
const tokenResult = await tokenExchange.getTokenWithPassword(username, password);

if (!tokenResult.success) {
  // IDP user exists, database updated, but token failed
  logger.warn(`Migration succeeded but token failed, using legacy JWT`);
  return this.generateLegacyToken(entity, entityType);
}
```

**Outcome**:

- ✅ User migrated (cognitoSub saved)
- ✅ Fallback to legacy JWT for this session
- ✅ Next signin will use IDP (no re-migration needed)

---

## Monitoring

### Migration Metrics

Track these metrics for production monitoring:

**1. Migration Success Rate**

```sql
-- Total users
SELECT COUNT(*) FROM "User";

-- Migrated users
SELECT COUNT(*) FROM "User" WHERE "cognitoSub" IS NOT NULL;

-- Migration rate
SELECT
  ROUND(100.0 * COUNT(*) FILTER (WHERE "cognitoSub" IS NOT NULL) / COUNT(*), 2) as migration_percentage
FROM "User";
```

**2. Unmigrated Users**

```sql
-- List unmigrated users
SELECT id, username, email, "createdAt"
FROM "User"
WHERE "cognitoSub" IS NULL
ORDER BY "createdAt" DESC;
```

**3. Recent Migrations**

```sql
-- Migrations in last 24 hours (based on updatedAt)
SELECT username, email, "cognitoSub", "updatedAt"
FROM "User"
WHERE "cognitoSub" IS NOT NULL
  AND "updatedAt" > NOW() - INTERVAL '24 hours'
ORDER BY "updatedAt" DESC;
```

### Backend Logs

**Successful migration**:

```
User olduser needs migration to IDP
✅ Created Keycloak user: olduser (uuid)
✅ Migrated user olduser to IDP (uuid)
✅ User olduser migrated during signin
```

**Migration failure**:

```
User olduser needs migration to IDP
Failed to create Keycloak user: Network error
⚠️ Migration failed for olduser, using legacy JWT
⚠️ User olduser using legacy JWT (IDP unavailable)
```

**Rollback**:

```
User olduser needs migration to IDP
✅ Created Keycloak user: olduser (uuid)
Database update failed: Connection lost
⚠️ Rolling back IDP user creation for olduser
✅ Deleted IDP user: olduser (uuid)
⚠️ Migration failed for olduser, using legacy JWT
```

### CloudWatch Alarms (Production)

Set up alarms for:

1. **High Migration Failure Rate**
   - Metric: Failed migrations / Total signin attempts
   - Threshold: > 5%
   - Action: Alert ops team

2. **IDP Service Unavailable**
   - Metric: Legacy JWT fallback count
   - Threshold: > 10 in 5 minutes
   - Action: Check IDP health

3. **Orphaned IDP Users**
   - Check: IDP user count != Database cognitoSub count
   - Frequency: Daily
   - Action: Run cleanup script

---

## Migration Endpoint (Future)

For monitoring and manual migration, create an admin endpoint:

**File**: `apps/backend/api/controllers/migration.controller.ts`

```typescript
// GET /api/migration/status
router.get('/status', authenticateToken, async (req, res) => {
  // Only SUPER_USER can access
  if (req.user.role !== 'SUPER_USER') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const totalUsers = await prisma.user.count();
  const migratedUsers = await prisma.user.count({
    where: { cognitoSub: { not: null } },
  });
  const totalClients = await prisma.client.count();
  const migratedClients = await prisma.client.count({
    where: { cognitoSub: { not: null } },
  });

  return res.json({
    users: {
      total: totalUsers,
      migrated: migratedUsers,
      unmigrated: totalUsers - migratedUsers,
      percentage: ((migratedUsers / totalUsers) * 100).toFixed(2),
    },
    clients: {
      total: totalClients,
      migrated: migratedClients,
      unmigrated: totalClients - migratedClients,
      percentage: ((migratedClients / totalClients) * 100).toFixed(2),
    },
  });
});
```

**Usage**:

```bash
curl http://localhost:5000/api/migration/status \
  -H "Authorization: Bearer $SUPER_USER_TOKEN"
```

---

## Next Steps

- Read [Token Validation](./05-TOKEN-VALIDATION.md) for token details
- Read [Troubleshooting](./06-TROUBLESHOOTING.md) for common issues
- Read [Production Deployment](../deployment/PRODUCTION-DEPLOYMENT.md)
