import { TaskStatusEnum } from '@prisma/client';

// api/config/taskConfig.ts
export const TASK_CONFIG = {
  OVERDUE_EXCLUDED_STATUSES: [
    TaskStatusEnum.COMPLETED,
    TaskStatusEnum.OVERDUE,
    TaskStatusEnum.APPROVED,
    TaskStatusEnum.REVIEW,
    TaskStatusEnum.TESTING,
    TaskStatusEnum.BLOCKED,
    TaskStatusEnum.ON_HOLD,
  ],
  OVERDUE_CHECK_BATCH_SIZE: 50,
  OVERDUE_CHECK_SCHEDULE: '0 9,* * *', // Daily at 9 am
};
