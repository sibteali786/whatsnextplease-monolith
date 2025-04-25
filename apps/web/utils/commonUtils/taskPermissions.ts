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
  // Task Agents and Supervisors see tasks assigned to them
  if (role === Roles.TASK_AGENT || role === Roles.TASK_SUPERVISOR) {
    return { assignedToId: userId };
  }

  // Clients see tasks they created
  if (role === Roles.CLIENT) {
    return { createdByClientId: userId };
  }

  // Super Users can see all tasks, but we'll filter by assigned or created
  // This could be customized further if needed
  if (role === Roles.SUPER_USER) {
    return {
      OR: [{ assignedToId: userId }, { createdByUserId: userId }],
    };
  }

  // Default empty filter (should not reach here if validation is done properly)
  return {};
};
