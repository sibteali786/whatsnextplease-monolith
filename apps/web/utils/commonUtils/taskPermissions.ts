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

export const TASK_ASSIGNEE_ROLES = [Roles.TASK_AGENT, Roles.TASK_SUPERVISOR] as const;

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

// Function to determine the filter condition based on role
export const getTaskFilterCondition = (userId: string, role: Roles) => {
  // Check if the role has permission to view tasks first
  if (!canViewTasks(role)) {
    return {}; // This will return no results
  }

  // For user profile context, everyone should see tasks assigned to that specific user
  // The role parameter is used for permission checking, not for determining what to show
  return { assignedToId: userId };
};
