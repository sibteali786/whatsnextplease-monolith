// utils/commonUtils/taskPermissions.ts
import { Roles } from '@prisma/client';

// Define role groups with specific access permissions
export const TASK_VIEWER_ROLES = [
  Roles.TASK_AGENT,
  Roles.TASK_SUPERVISOR,
  Roles.CLIENT,
  Roles.SUPER_USER,
] as const;

export const TASK_CREATOR_ROLES = [Roles.CLIENT, Roles.TASK_SUPERVISOR, Roles.SUPER_USER] as const;

export const TASK_ASSIGNEE_ROLES = [Roles.TASK_AGENT] as const;

export enum USER_CREATED_TASKS_CONTEXT {
  USER_PROFILE = 'user-profile',
  GENERAL = 'general',
}

// Helper functions to check role permissions
export const canViewTasks = (role: Roles): boolean => {
  return TASK_VIEWER_ROLES.includes(role as any);
};

export const canCreateTasks = (role: Roles): boolean => {
  return TASK_CREATOR_ROLES.includes(role as any);
};

export const canBeAssignedTasks = (role: Roles): boolean => {
  return TASK_ASSIGNEE_ROLES.includes(role as any);
};

// Context-specific filter functions
export const getUserProfileTaskFilter = (profileUserId: string) => {
  // For user profiles - always show tasks assigned to the profile user
  return { assignedToId: profileUserId };
};

export const getGeneralTaskFilter = (currentUserId: string, currentUserRole: Roles) => {
  // For general contexts (dashboards, task lists) - role-based filtering

  // Task Agents and Supervisors see tasks assigned to them
  if (currentUserRole === Roles.TASK_AGENT || currentUserRole === Roles.TASK_SUPERVISOR) {
    return { assignedToId: currentUserId };
  }

  // Clients see tasks they created
  if (currentUserRole === Roles.CLIENT) {
    return { createdByClientId: currentUserId };
  }

  // Super Users can see all tasks or apply custom logic
  if (currentUserRole === Roles.SUPER_USER) {
    return {}; // See all tasks, or add custom logic here
  }

  // Default - no tasks
  return { id: 'never-match' };
};

// Backward compatibility - deprecated, use context-specific functions above
export const getTaskFilterCondition = (userId: string, role: Roles) => {
  console.warn(
    'getTaskFilterCondition is deprecated. Use getUserProfileTaskFilter or getGeneralTaskFilter instead.'
  );
  return getGeneralTaskFilter(userId, role);
};
