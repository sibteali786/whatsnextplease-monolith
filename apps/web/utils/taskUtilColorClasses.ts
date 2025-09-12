// Updated commonClasses.ts with enhanced status and priority colors

export const taskStatusColors = {
  // Existing statuses
  NEW: 'bg-blue-500 text-white hover:bg-blue-600',
  IN_PROGRESS: 'bg-yellow-500 text-black hover:bg-yellow-600',
  COMPLETED: 'bg-green-500 text-white hover:bg-green-600',
  OVERDUE: 'bg-red-500 text-white hover:bg-red-600',
  REVIEW: 'bg-purple-500 text-white hover:bg-purple-600',
  CONTENT_IN_PROGRESS: 'bg-orange-500 text-white hover:bg-orange-600',
  TESTING: 'bg-cyan-500 text-white hover:bg-cyan-600',
  BLOCKED: 'bg-red-700 text-white hover:bg-red-800',
  ON_HOLD: 'bg-gray-500 text-white hover:bg-gray-600',
  APPROVED: 'bg-green-700 text-white hover:bg-green-800',
  REJECTED: 'bg-red-300 text-black hover:bg-red-400',
} as const;

export const taskPriorityColors = {
  // Updated priority system
  CRITICAL: 'bg-red-500 text-white hover:bg-red-700',
  HIGH: 'bg-orange-500 text-white hover:bg-orange-600',
  MEDIUM: 'bg-yellow-500 text-black hover:bg-yellow-600',
  LOW: 'bg-blue-500 text-white hover:bg-blue-600',
  HOLD: 'bg-gray-400 text-white hover:bg-gray-500',
  URGENT: 'bg-red-500 text-white hover:bg-red-600',
  NORMAL: 'bg-yellow-500 text-black hover:bg-yellow-600',
  LOW_PRIORITY: 'bg-blue-500 text-white hover:bg-blue-600',
} as const;

// Type definitions for better TypeScript support
export type TaskStatusColorKey = keyof typeof taskStatusColors;
export type TaskPriorityColorKey = keyof typeof taskPriorityColors;
