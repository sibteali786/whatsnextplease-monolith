import { TaskSchema, TaskTable } from '@/utils/validationSchemas';
import { PaginatedApiResponse, StandardApiResponse } from '../api';
import { TaskPriorityEnum, TaskStatusEnum, TaskViewFilter } from '@prisma/client';
import z from 'zod';
import { ClientWithRole, UserWithRole } from '@/components/settings/types';
import { TaskLink } from '../tasks';

// Task data types
export interface TaskData extends z.infer<typeof TaskSchema> {}

export interface TaskMetadata {
  statuses: {
    id: string;
    name: TaskStatusEnum;
    displayName: string;
  }[];
  priorities: {
    id: string;
    name: TaskPriorityEnum;
    displayName: string;
    isLegacy: boolean;
  }[];
  priorityLevels: {
    critical: { id: string; priorityName: TaskPriorityEnum }[];
    high: { id: string; priorityName: TaskPriorityEnum }[];
    medium: { id: string; priorityName: TaskPriorityEnum }[];
    low: { id: string; priorityName: TaskPriorityEnum }[];
    hold: { id: string; priorityName: TaskPriorityEnum }[];
  };
}

export interface TaskStatistics {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  overdueTasks: number;
  tasksCreatedToday: number;
}

export interface TaskCounts {
  assigned: number;
  unassigned: number;
  completed: number;
  inProgress: number;
}
export interface TasksByStatusData {
  tasks: TaskTable[];
  count: number;
}

export interface TaskCountForUserById {
  userId: string;
  userInfo: {
    firstName: string;
    lastName: string;
    role?: string;
  };
  taskCounts: {
    totalTasks: number;
    activeTasksCount: number;
    byStatus: Record<string, number>;
  };
  metadata: {
    includeCompleted: boolean;
    statusFilter: TaskStatusEnum[];
    lastUpdated: string;
  };
}

export interface GetTaskCategoryAll {
  id: string;
  categoryName: string;
  tasks: Partial<TaskData[]>;
}

export type UserProfileType = UserWithRole;

export type ClientProfileType = ClientWithRole;

export interface ClientProfileUpdateResponse {
  id: string;
  avatarUrl: string | null;
}

export interface SkillAssignment {
  id: string;
  name: string;
}

export interface TaskAgentWithCounts {
  id: string;
  firstName: string;
  lastName: string;
  designation: string | null;
  assignedTasksCount: number;
  newTasksCount: number;
  inProgressTasksCount: number;
  completedTasksCount: number;
  overdueTasksCount: number;
}

export interface SuggestPrefix {
  prefix: string;
  isUnique: boolean;
  categoryName: string;
}

export interface PrefixCheck {
  prefix: string;
  isUnique: boolean;
  available: boolean;
}

export interface SerialNumberValidation {
  serialNumber: string;
  isValid: boolean;
  isAvailable: boolean;
  exists: boolean;
  components?: {
    prefix: string;
    number: number;
  };
  reason?: string;
}

export interface GetTaskBySerialNumber {
  priority: {
    id: string;
    priorityName: TaskPriorityEnum;
  };
  status: {
    id: string;
    statusName: TaskStatusEnum;
  };
  taskCategory: {
    prefix: string | null;
    id: string;
    categoryName: string;
  };
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
  associatedClient: {
    id: string;
    avatarUrl: string | null;
    companyName: string;
    contactName: string | null;
  } | null;
  taskSkills: ({
    skill: {
      id: string;
      name: string;
    };
  } & {
    taskId: string;
    skillId: string;
  })[];
  taskFiles: ({
    file: {
      id: string;
      fileName: string;
      filePath: string;
      fileSize: string;
      uploadedAt: Date;
      uploadedBy: string;
    };
  } & {
    taskId: string;
    fileId: string;
  })[];
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskAgentIds = string[];

export interface UserProfileState {
  user: UserProfileType;
  client: ClientProfileType;
}

export interface TaskAgentWithCounts {
  id: string;
  firstName: string;
  lastName: string;
  designation: string | null;
  assignedTasksCount: number;
  newTasksCount: number;
  inProgressTasksCount: number;
  completedTasksCount: number;
  overdueTasksCount: number;
}

const FileSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  fileSize: z.string(),
  dateUploaded: z.date(),
  lastUpdated: z.date(),
  uploadedBy: z.string(),
});

export interface SkillCategoryCreate {
  id: string;
  categoryName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskCategoryCreate {
  id: string;
  categoryName: string;
  prefix: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSkill {
  id: string;
  name: string;
  description: string | null;
  skillCategoryId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type FileType = z.infer<typeof FileSchema>;
export type FilesByUserId = PaginatedApiResponse<FileType[]>;
export type FileIdsByUserId = StandardApiResponse<string[]>;
// API Response types using StandardApiResponse
export type CreateDraftTaskResponse = StandardApiResponse<TaskData>;
export type UpdateTaskResponse = StandardApiResponse<TaskData>;
export type DeleteTaskResponse = StandardApiResponse<{ taskId: string }>;
export type GetTaskByIdResponse = StandardApiResponse<{ task: TaskData }>;
export type SearchTasksResponse = StandardApiResponse<{ tasks: TaskData[] }>;
export type GetTasksResponse = PaginatedApiResponse<TaskData[]>;
export type GetTaskIdsResponse = StandardApiResponse<string[]>;
export type GetTaskStatisticsResponse = StandardApiResponse<TaskStatistics>;
export type GetTaskCountsResponse = StandardApiResponse<TaskCounts>;
export type GetTaskMetadataResponse = StandardApiResponse<TaskMetadata>;
export type BatchUpdateTasksResponse = StandardApiResponse<{ updatedCount: number }>;
export type BatchDeleteTasksResponse = StandardApiResponse<{ deletedCount: number }>;
export type ApplyTaskViewFilterResponse = StandardApiResponse<TaskViewFilter>;
export type GetTaskViewFiltersResponse = StandardApiResponse<TaskViewFilter[]>;
export type GetTasksByStatusResponse = StandardApiResponse<
  Record<TaskStatusEnum, TasksByStatusData>
>;
export type GetTaskCountForUserByIdResponse = StandardApiResponse<TaskCountForUserById>;
export type GetTaskCategoryAllResponse = GetTaskCategoryAll[];
export type GetUserProfileResponse = StandardApiResponse<UserProfileType>;
export type GetClientProfileResponse = StandardApiResponse<ClientProfileType>;
export type GetUserOrClientProfileResponse = StandardApiResponse<
  UserProfileType | ClientProfileType
>;
export type UpdateClientProfilePictureResponse = StandardApiResponse<ClientProfileUpdateResponse>;
export type UpdateClientProfileResponse = StandardApiResponse<ClientProfileType>;
export type UpdateUserProfileResponse = StandardApiResponse<UserProfileType>;
export type SkillAssignToUserResponse = StandardApiResponse<SkillAssignment[]>;
export type TaskAgentIdsResponse = StandardApiResponse<TaskAgentIdsResponse>;
export type TaskAgentsResponse = PaginatedApiResponse<TaskAgentWithCounts[]>;
export type SuggestPrefixResponse = StandardApiResponse<SuggestPrefix>;
export type PrefixCheckResponse = StandardApiResponse<PrefixCheck>;
export type SerialNumberValidationResponse = StandardApiResponse<SerialNumberValidation>;
export type GetTaskBySerialNumberResponse = StandardApiResponse<GetTaskBySerialNumber>;
export type GetUserProfileStateResponse = StandardApiResponse<UserProfileState>;
export type GetTaskAgentsWithCountsResponse = StandardApiResponse<TaskAgentWithCounts>;
export type PatchClientProfileById = StandardApiResponse<ClientProfileType>;
export type PatchUserProfileById = StandardApiResponse<UserProfileType>;
export type CreateClientResponse = StandardApiResponse<ClientProfileType>;
export type CreateSkillCategoryResponse = StandardApiResponse<SkillCategoryCreate>;
export type CreateTaskCategoryResponse = StandardApiResponse<TaskCategoryCreate>;
export type CreateSkillResponse = StandardApiResponse<CreateSkill>;
export type TaskLinksGetResponse = StandardApiResponse<TaskLink[]>;
export type CreateTaskLinkResponse = StandardApiResponse<TaskLink>;
