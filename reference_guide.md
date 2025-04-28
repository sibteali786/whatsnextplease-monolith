# Reference for Different Features Built over time

This doc reflects how a particular feature used to be and how it was improved.

## Table of Contents

- [Task Permission](#task-permissions)
- [Entity API Documentation](#entity-api-documentation)

## Task Permissions

This document outlines the changes made to improve the role-based permission system for task-related operations in the application.

### Overview

The previous implementation hardcoded role checks in multiple locations, making it difficult to maintain and extend. The new approach centralizes role permissions in a dedicated module, making it easier to:

1. Add or remove roles that have specific permissions
2. Understand which roles have which permissions at a glance
3. Reuse permission logic across different parts of the application
4. Test permissions logic independently from business logic

### Files Changed

1. **New File**: `utils/commonUtils/taskPermissions.ts` - Central location for task-related permission logic
2. **Updated**: `getTasksByUserId.ts` - Now uses the permission utilities
3. **Updated**: `getTaskIdsByUserId.ts` - Now uses the permission utilities
4. **New File**: `utils/commonUtils/__tests__/taskPermissions.test.ts` - Unit tests for permission logic

### Implementation Details

#### Permission Groups

The new system defines role groups with specific access permissions:

```typescript
export const TASK_VIEWER_ROLES = [
  Roles.TASK_AGENT,
  Roles.TASK_SUPERVISOR,
  Roles.CLIENT,
  Roles.SUPER_USER,
] as const;

export const TASK_CREATOR_ROLES = [Roles.CLIENT, Roles.TASK_SUPERVISOR, Roles.SUPER_USER] as const;

export const TASK_ASSIGNEE_ROLES = [Roles.TASK_AGENT, Roles.TASK_SUPERVISOR] as const;
```

#### Permission Check Functions

Helper functions are provided to check permissions:

```typescript
export const canViewTasks = (role: Roles): boolean => {
  return TASK_VIEWER_ROLES.includes(role as any);
};

export const canCreateTasks = (role: Roles): boolean => {
  return TASK_CREATOR_ROLES.includes(role as any);
};

export const canBeAssignedTasks = (role: Roles): boolean => {
  return TASK_ASSIGNEE_ROLES.includes(role as any);
};
```

#### Filter Condition Generator

A function that returns the appropriate filter condition based on role:

```typescript
export const getTaskFilterCondition = (userId: string, role: Roles) => {
  if (role === Roles.TASK_AGENT || role === Roles.TASK_SUPERVISOR) {
    return { assignedToId: userId };
  }

  if (role === Roles.CLIENT) {
    return { createdByClientId: userId };
  }

  if (role === Roles.SUPER_USER) {
    return {
      OR: [{ assignedToId: userId }, { createdByUserId: userId }],
    };
  }

  return {};
};
```

### How to Use

#### Checking Permissions

```typescript
import { canViewTasks } from '@/utils/commonUtils/taskPermissions';

if (!canViewTasks(userRole)) {
  return {
    success: false,
    message: 'You do not have permission to view tasks',
  };
}
```

#### Getting Filter Conditions

```typescript
import { getTaskFilterCondition } from '@/utils/commonUtils/taskPermissions';

const whereCondition = getTaskFilterCondition(userId, role);

const tasks = await prisma.task.findMany({
  where: {
    ...whereCondition,
    // other conditions...
  },
  // ...
});
```

### Extending Permissions

To add new roles to an existing permission:

1. Update the relevant constant in `taskPermissions.ts`:

```typescript
export const TASK_VIEWER_ROLES = [
  Roles.TASK_AGENT,
  Roles.TASK_SUPERVISOR,
  Roles.CLIENT,
  Roles.SUPER_USER,
  Roles.NEW_ROLE, // Add new role here
] as const;
```

2. If needed, update the `getTaskFilterCondition` function to handle the new role.

3. Update the unit tests to verify the new permissions.

### Benefits

- **Consistency**: Role checks are consistent across the application
- **Maintainability**: Changes to role permissions only need to be made in one place
- **Testability**: Permission logic can be tested independently
- **Documentation**: The permission groups serve as documentation for what roles have what permissions

## Entity API Documentation

### Overview

The Entity API provides a unified interface for operations on different entity types (users and clients) through a consistent set of endpoints. This design simplifies frontend integration by abstracting the underlying entity type while maintaining proper authorization and validation.

### Base URL

```
/entity
```

### Authentication

All endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### Entity Types

The API supports the following entity types:

- `user` - User entity
- `client` - Client entity

### Endpoints

#### Get Entity Profile

Retrieve profile information for a specific entity.

```
GET /entity/:type/:id
```

##### Path Parameters

| Parameter | Type   | Description                                    |
| --------- | ------ | ---------------------------------------------- |
| type      | string | Entity type. Must be either "user" or "client" |
| id        | string | Entity ID                                      |

##### Response

```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "avatarUrl": "string"
  // Additional fields based on entity type
}
```

##### Status Codes

- 200 - Success
- 400 - Bad request (invalid entity type)
- 401 - Unauthorized (missing or invalid token)
- 404 - Entity not found

##### Permissions

- Available to all authenticated users

---

#### Delete Entity

Delete an entity by ID.

```
DELETE /entity/:type/:id
```

##### Path Parameters

| Parameter | Type   | Description                                    |
| --------- | ------ | ---------------------------------------------- |
| type      | string | Entity type. Must be either "user" or "client" |
| id        | string | Entity ID                                      |

##### Response

```json
{
  "success": true,
  "message": "User/Client deleted successfully"
}
```

##### Status Codes

- 200 - Success
- 400 - Bad request (invalid entity type)
- 401 - Unauthorized (missing or invalid token)
- 403 - Forbidden (insufficient permissions)
- 404 - Entity not found

##### Permissions

- Requires SUPER_USER or TASK_SUPERVISOR role

### Error Responses

All error responses follow the same format:

```json
{
  "code": "ERROR_CODE",
  "status": 400,
  "message": "Error message",
  "details": {}
}
```

Common error codes:

- `BAD_REQUEST` - Invalid input parameters
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `INTERNAL_SERVER_ERROR` - Server error

### Example Usage (Frontend)

```typescript
// Using the EntityClient
const apiClient = new EntityClient(API_URL, authToken);

// Delete a user
await apiClient.deleteEntity(EntityType.USER, userId);

// Get a client profile
const clientProfile = await apiClient.getEntityProfile(EntityType.CLIENT, clientId);
```

### Implementation Details

#### Controller Structure

The EntityController delegates operations to the appropriate service based on the entity type:

```typescript
if (entityType === 'user') {
  // Use UserService
} else if (entityType === 'client') {
  // Use ClientService
}
```

#### Validation Flow

1. Request validation (entity type, required parameters)
2. Authorization check (role-based permissions)
3. Entity existence verification
4. Operation execution

#### Extending the API

To add support for a new entity type:

1. Update the entity type validation to include the new type
2. Add the appropriate service to the EntityController
3. Implement handling for the new type in each method
4. Update unit and integration tests
