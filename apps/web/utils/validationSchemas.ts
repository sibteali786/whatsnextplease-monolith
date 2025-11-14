import { DurationEnum } from '@/types';
import { Prisma, Roles, TaskPriorityEnum, TaskStatusEnum } from '@prisma/client';
import { z } from 'zod';
// Shared Zod schema for registration
export const registerSchema = z
  .object({
    email: z.string().email('Please provide a valid email'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters long')
      .max(20, 'Password can be at max 20 characters long')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[\W_]/, 'Password must contain at least one special character'),
    firstName: z
      .string()
      .min(3, 'First Name must be at least 3 characters')
      .max(20, 'First Name cannot exceed 20 characters')
      .optional(),
    lastName: z
      .string()
      .min(3, 'Last Name must be at least 3 characters')
      .max(20, 'Last Name cannot exceed 20 characters')
      .optional(),
    username: z.string().min(3, 'Username must be at least 3 characters'),
    role: z.nativeEnum(Roles),
    companyName: z.string().optional(),
    contactName: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === Roles.CLIENT) {
      // Validate companyName and contactName for Client
      if (!data.companyName || data.companyName.trim() === '') {
        ctx.addIssue({
          message: 'Company Name is required for Client role',
          code: z.ZodIssueCode.custom,
          path: ['companyName'],
        });

        return z.NEVER;
      }
      if (!data.contactName || data.contactName.trim() === '') {
        ctx.addIssue({
          path: ['contactName'],
          code: z.ZodIssueCode.custom,
          message: 'Contact Name is required for Client role',
        });
      }
    } else {
      // Validate firstName and lastName for non-Client roles
      if (!data.firstName || data.firstName.trim() === '') {
        ctx.addIssue({
          path: ['firstName'],
          code: z.ZodIssueCode.custom,
          message: 'First Name is required for roles other than Client',
        });
      }
      if (!data.lastName || data.lastName.trim() === '') {
        ctx.addIssue({
          path: ['lastName'],
          code: z.ZodIssueCode.custom,
          message: 'Last Name is required for roles other than Client',
        });
      }
    }
  });

// Shared Zod schema for sign-in
export const signInSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

// Zod schema for adding a client
export const addClientSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  companyName: z
    .string({
      required_error: 'Company Name is required',
      invalid_type_error: 'Company Name must be a string',
    })
    .min(3, 'Company Name must be at least 3 characters'),
  contactName: z
    .string({
      required_error: 'Contact Name is required',
      invalid_type_error: 'Contact Name must be a string',
    })
    .min(3, 'Contact name must be at least 3 characters'),
  phone: z
    .string({
      required_error: 'Phone Number is required',
      invalid_type_error: 'Phone Number must be a string',
    })
    .max(20, 'Phone Number cannot exceed 20 characters')
    .optional(),
  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a string',
    })
    .email('Please provide a valid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[\W_]/, 'Password must contain at least one special character'),
  website: z
    .string({
      required_error: 'Website is required',
      invalid_type_error: 'Website must be a string',
    })
    .url('Please provide a valid URL')
    .optional(),
  address1: z
    .string({
      required_error: 'Address 1 is required',
      invalid_type_error: 'Address 1 must be a string',
    })
    .max(255, 'Address 1 cannot exceed 255 characters')
    .optional(),
  address2: z
    .string({
      required_error: 'Address 2 is required',
      invalid_type_error: 'Address 2 must be a string',
    })
    .max(255, 'Address 2 cannot exceed 255 characters')
    .optional(),
  city: z
    .string({
      required_error: 'City is required',
      invalid_type_error: 'City must be a string',
    })
    .max(100, 'City cannot exceed 100 characters')
    .optional(),
  state: z
    .string({
      required_error: 'State is required',
      invalid_type_error: 'State must be a string',
    })
    .max(50, 'State cannot exceed 50 characters')
    .optional(),
  zipCode: z
    .string({
      required_error: 'Zip Code is required',
      invalid_type_error: 'Zip Code must be a string',
    })
    .max(20, 'Zip Code cannot exceed 20 characters')
    .optional(),
});

// You can then use this schema with `react-hook-form` for form validation.

export type AddClientInput = z.infer<typeof addClientSchema>;

export const addUserSchema = z.object({
  role: z.string(),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[\W_]/, 'Password must contain at least one special character'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
});

export type AddUserInput = z.infer<typeof addUserSchema>;

export const InputParamsSchema = z.object({
  clientId: z.string().uuid(),
  cursor: z.string().nullable(),
  pageSize: z.number().int().positive().default(10),
});

export const errorSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  errorCode: z.string().optional(),
  details: z.any().optional(),
  statusCode: z.number().optional(),
});

export type InputParamsType = typeof InputParamsSchema;

export const ClientSchema = z.object({
  id: z.string(),
  username: z.string(),
  companyName: z.string(),
  contactName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  address1: z.string().nullable(),
  address2: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zipCode: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});
export const ClientsListResponseSchema = errorSchema.merge(
  z.object({
    clients: z.array(ClientSchema).optional(),
    nextCursor: z.string().nullable().optional(),
    hasNextPage: z.boolean().optional(),
    totalCount: z.number().optional(),
  })
);
export type ClientsListResponse = z.infer<typeof ClientsListResponseSchema>;
// Define the input parameters schema
export const GetClientsListParamsSchema = z.object({
  cursor: z.string().nullable(),
  pageSize: z.number().min(1).default(10),
});

export const ActiveClientSchema = z.object({
  id: z.string(),
  companyName: z.string(),
  contactName: z.string(),
  activeTaskCount: z.number(),
});
export const ActiveClientsResponseSchema = errorSchema.merge(
  z.object({
    clients: z.array(ActiveClientSchema).optional(),
  })
);

export type ActiveClientsResponse = z.infer<typeof ActiveClientsResponseSchema>;
const FileSchemaTask = z.object({
  id: z.string().uuid(),
  fileName: z.string(),
  filePath: z.string(),
  fileSize: z.string(),
  uploadedBy: z.string(),
  uploadedAt: z.coerce.date(), // or z.date().transform(...) if you prefer
});
export type FileSchemaType = z.infer<typeof FileSchemaTask>;
const TaskFileSchema = z.object({
  file: FileSchemaTask,
});
export type TaskFile = z.infer<typeof TaskFileSchema>;
export const FileAttachmentsListSchema = z.object({
  files: z.array(TaskFileSchema),
  onDownload: z.function().args(FileSchemaTask).optional(),
  onDelete: z.function().args(z.string()).optional(),
  isLoading: z.boolean().optional(),
});

export type FileAttachmentsList = z.infer<typeof FileAttachmentsListSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: z.object({
    priorityName: z.nativeEnum(TaskPriorityEnum),
  }),
  status: z.object({
    statusName: z.nativeEnum(TaskStatusEnum),
  }),
  taskCategory: z.object({
    categoryName: z.string(),
  }),
  assignedTo: z
    .object({
      id: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      avatarUrl: z.string().nullable(),
    })
    .nullable(),
  associatedClient: z
    .object({
      id: z.string(),
      companyName: z.string(),
      contactName: z.string(),
      avatarUrl: z.string().nullable(),
    })
    .nullable(),
  taskSkills: z.array(z.string()),
  timeForTask: z.instanceof(Prisma.Decimal), // Update to expect a number
  overTime: z.instanceof(Prisma.Decimal).nullable(),
  dueDate: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdByUserId: z.string().nullable().optional(),
  createdByUser: z
    .object({
      id: z.string(),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  createdByClient: z
    .object({
      id: z.string(),
      companyName: z.string().nullable().optional(),
      contactName: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  createdByClientId: z.string().nullable().optional(),
  assignedToId: z.string().nullable().optional(),
  associatedClientId: z.string().nullable().optional(),
  taskFiles: z.array(TaskFileSchema).optional().nullable(),
});
export type Task = z.infer<typeof TaskSchema>;
const TaskTableSchema = TaskSchema;
export type TaskTable = z.infer<typeof TaskTableSchema>;

export const GetTasksByClientIdResponseSchema = errorSchema.merge(
  z.object({
    tasks: z.array(TaskTableSchema).optional(),
    nextCursor: z.string().nullable().optional(),
    hasNextCursor: z.boolean().optional(),
    totalCount: z.number().optional(),
  })
);

export type GetTasksByClientIdResponse = z.infer<typeof GetTasksByClientIdResponseSchema>;
export const TaskByUserIdSchema = GetTasksByClientIdResponseSchema;
export type TaskByUserIdResponse = GetTasksByClientIdResponse;
export const ActiveClientCountResponseSchema = errorSchema.merge(
  z.object({
    count: z.number().int().nonnegative().optional(),
  })
);

export type ActiveClientCountResponse = z.infer<typeof ActiveClientCountResponseSchema>;
/**
 * Zod schema defining the structure of the file data retrieved by client ID.
 */
export const FileSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  fileSize: z.string(),
  dateUploaded: z.date(),
  lastUpdated: z.date(),
  uploadedBy: z.string(),
});

/**
 * Zod schema for the overall response structure
 */
export const GetFilesByClientIdResponseSchema = errorSchema.merge(
  z.object({
    files: z.array(FileSchema).optional(),
    hasNextCursor: z.boolean().optional(),
    nextCursor: z.string().nullable().optional(),
    totalCount: z.number().int().nonnegative().optional(),
  })
);

export type GetFilesByClientIdResponse = z.infer<typeof GetFilesByClientIdResponseSchema>;

// schemas/invoiceSchemas.ts (continued)

export const InvoiceStatusEnum = z.enum(['PENDING', 'PAID', 'OVERDUE']);

export const InvoiceSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string(),
  date: z.date(),
  amount: z.string(),
  status: InvoiceStatusEnum,
  task: z.object({
    categoryName: z.string(),
  }),
});

export const GetInvoicesByClientIdResponseSchema = z.object({
  success: z.boolean(),
  invoices: z.array(InvoiceSchema).optional(),
  hasNextCursor: z.boolean().optional(),
  nextCursor: z.string().nullable().optional(),
  totalCount: z.number().int().nonnegative().optional(),
  message: z.string().optional(),
  errorCode: z.string().optional(),
  details: z.any().optional(),
});

export type GetInvoicesByClientIdResponse = z.infer<typeof GetInvoicesByClientIdResponseSchema>;

export const CreateClientSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters long.'),
  contactName: z.string().nullable().optional(),
  email: z.string().email('Invalid email format.'),
  passwordHash: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[\W_]/, 'Password must contain at least one special character'),
  phone: z.string().nullable().optional(),
  website: z.string().url('Invalid URL format.').nullable().optional(),
  address1: z.string().nullable().optional(),
  address2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zipCode: z.string().nullable().optional(),
});
export const CreateClientSchemaResponse = CreateClientSchema.merge(
  z.object({
    id: z.string().uuid(),
    role: z.object({
      name: z.nativeEnum(Roles),
    }),
  })
);

export const AddClientResponseSchema = z.object({
  success: z.boolean(),
  client: CreateClientSchemaResponse.optional(),
  message: z.string().optional(),
  errorCode: z.string().optional(),
  details: z.any().optional(),
});

export type AddClientResponse = z.infer<typeof AddClientResponseSchema>;

// Define Zod schema for input validation
export const SearchTasksSchema = z.object({
  searchTerm: z.string().min(1, 'Search term cannot be empty'),
});

// Define the task schema for response validation

export const TaskSearchSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  dueDate: z.date().nullable(),
  priority: z.object({
    priorityName: z.string(),
  }),
  status: z.object({
    statusName: z.string(),
  }),
  taskCategory: z.object({
    categoryName: z.string(),
  }),
  assignedTo: z
    .object({
      firstName: z.string(),
      lastName: z.string(),
      avatarUrl: z.string().nullable(),
    })
    .nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Define the response schema
export const SearchTasksResponseSchema = errorSchema.merge(
  z.object({
    tasks: z.array(TaskSearchSchema).optional(),
  })
);

// Types for response and input
export type SearchTasksInput = z.infer<typeof SearchTasksSchema>;
export type SearchTasksResponse = z.infer<typeof SearchTasksResponseSchema>;

export const GetTaskByIdParamsSchema = z.object({
  taskId: z.string(),
});

// Define the response schema for the task data
export const GetTaskByIdResponseSchema = errorSchema.merge(
  z.object({
    task: TaskSchema.nullable(),
  })
);

export type GetTaskByIdResponse = z.infer<typeof GetTaskByIdResponseSchema>;

export const GetTasksCountByStatusResponseSchema = errorSchema.merge(
  z.object({
    tasksWithStatus: z.record(z.nativeEnum(TaskStatusEnum), z.number()),
  })
);

export type GetTasksCountByStatusResponse = z.infer<typeof GetTasksCountByStatusResponseSchema>;
export const TaskDraftResponseSchema = errorSchema.merge(
  z.object({ task: TaskSchema.pick({ id: true }) })
);
export type CreateDraftTask = z.infer<typeof TaskDraftResponseSchema>;
export const DeleteTaskResponseSchema = TaskDraftResponseSchema;
export type DeleteTask = z.infer<typeof DeleteTaskResponseSchema>;
export const DeleteTaskInputSchema = z.object({
  taskId: z.string(),
});

// Define input and response schemas
export const UpdateTaskParamsSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  priorityName: z.nativeEnum(TaskPriorityEnum),
  statusName: z.nativeEnum(TaskStatusEnum),
  taskCategoryName: z.string(),
  // Use z.coerce.date() to handle date strings:
  dueDate: z.coerce.date().optional().nullable(),
  // Transform string to Prisma.Decimal:
  timeForTask: z.string().optional(),
  overTime: z.string().optional(),
  skills: z.array(z.string()).optional(),
  assignedToId: z.string().optional().nullable(),
  assignedToClientId: z.string().optional().nullable(),
  initialComment: z.string().max(5000).optional(),
});

export type UpdateTaskParams = z.infer<typeof UpdateTaskParamsSchema>;

export const UpdateTaskResponseSchema = errorSchema.merge(
  z.object({
    task: UpdateTaskParamsSchema.nullable(),
  })
);

export type UpdateTaskResponse = z.infer<typeof UpdateTaskResponseSchema>;
// FileWithMetadata Schema
export const FileWithMetaDataFESchema = z.object({
  file: z.unknown().transform(value => {
    return value as File;
  }),
  uploadTime: z.date(),
  progress: z.number(),
});
export const FileWithMetadataSchema = z
  .object({
    uploadTime: z.coerce.date(),
    progress: z.number(),
  })
  .optional();
export const UploadFileToS3Response = z.object({
  success: z.boolean(),
  data: FileWithMetadataSchema,
  message: z.string().optional(),
});
export type UploadFileToS3 = z.infer<typeof UploadFileToS3Response>;
export const UploadFileWithProgressSchema = errorSchema.merge(
  z.object({
    data: FileWithMetadataSchema,
  })
);

// TypeScript Types for Inference
export type FileWithMetadataFE = z.infer<typeof FileWithMetaDataFESchema>;
export type FileWithMetadata = z.infer<typeof FileWithMetadataSchema>;
export type UploadFileWithProgress = z.infer<typeof UploadFileWithProgressSchema>;

export const SkillsSchema = z.object({
  id: z.string(),
  categoryName: z.string(),
  skills: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable(),
    })
  ),
});

export type SkillsSchema = z.infer<typeof SkillsSchema>;
// Now we just have userId (regardless of role)

export enum UploadContextType {
  TASK = 'TASK',
  CLIENT_PROFILE = 'CLIENT_PROFILE',
  USER_PROFILE = 'USER_PROFILE',
  TASK_COMMENT = 'TASK_COMMENT',
}
export const FileMetadataSchema = z.object({
  fileName: z.string(),
  fileSize: z.string(),
  uploadedBy: z.string(),
  createdAt: z.string(),
  role: z.string(),
  userId: z.string(), // The uploader's ID

  // Context-specific fields (one of these should be present)
  taskId: z.string().optional(), // For task files
  targetClientId: z.string().optional(), // For client profile files
  targetUserId: z.string().optional(), // For user profile files

  // Upload context type
  uploadContext: z.nativeEnum(UploadContextType),
});

export type FileMetadataInput = z.infer<typeof FileMetadataSchema>;
export const getUnassignedTasksInputSchema = z.object({
  pageSize: z
    .string()
    .transform(value => parseInt(value, 10))
    .refine(value => value > 0, {
      message: 'Page size must be a positive number',
    })
    .optional(),
  cursor: z.string().optional().nullable(),
});
export const UnassignedTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: z.object({
    priorityName: z.nativeEnum(TaskPriorityEnum),
  }),
  taskCategory: z.object({
    categoryName: z.string(),
  }),
  status: z.object({
    statusName: z.nativeEnum(TaskStatusEnum),
  }),
  taskSkills: z.array(z.string()),
  assignedTo: z
    .object({
      firstName: z.string(),
      lastName: z.string(),
      avatarUrl: z.string().nullable(),
    })
    .nullable(),
  dueDate: z.coerce.date().nullable(),
});

export type TaskType = z.infer<typeof UnassignedTaskSchema>;
// Output Schema for the API Response
export const getUnassignedTasksOutputSchema = z.object({
  success: z.boolean(),
  tasks: z.array(UnassignedTaskSchema),
  hasNextCursor: z.boolean(),
  nextCursor: z.string().nullable(),
  totalCount: z.number(),
});

// Zod Schema for Input Validation
export const getTasksCountInputSchema = z.object({
  role: z.enum(['SUPER_USER', 'TASK_SUPERVISOR']),
});

// Zod Schema for Output Validation
export const getTasksCountOutputSchema = z.object({
  success: z.boolean(),
  taskCounts: z.object({
    UnassignedTasks: z.number().nonnegative(),
    AssignedTasks: z.number().nonnegative(),
  }),
});

// Input validation schema
export const getTasksInputSchema = z.object({
  type: z.enum(['all', 'unassigned', 'assigned']).default('all'),
  cursor: z.string().optional().nullable(),
  pageSize: z.coerce.number().default(10),
  searchTerm: z.string().optional(),
  duration: z.nativeEnum(DurationEnum).default(DurationEnum.ALL),
  role: z.nativeEnum(Roles),
});

export const getTasksOutputSchema = errorSchema.merge(
  z.object({
    tasks: z.array(TaskTableSchema).nullable(),
    hasNextCursor: z.boolean(),
    nextCursor: z.string().nullable(),
    totalCount: z.number(),
  })
);

// Input validation schema
export const getIdsByTypeInputSchema = z.object({
  type: z.enum(['all', 'unassigned', 'assigned']).default('all'),
  searchTerm: z.string().optional(),
  duration: z.nativeEnum(DurationEnum).default(DurationEnum.ALL),
  role: z.nativeEnum(Roles),
});
export const getTaskIdsByTypeOutput = errorSchema.merge(
  z.object({
    success: z.boolean(),
    taskIds: z.array(z.string()).nullable(),
  })
);

const userAssigneeSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  avatarUrl: z.string().url().nullable(),
});

export type UserAssigneeSchema = z.infer<typeof userAssigneeSchema>;

export const getAllUsersOutputSchema = errorSchema.merge(
  z.object({
    users: z.array(userAssigneeSchema),
    hasMore: z.boolean().optional(),
  })
);

export const getAllUsersInputSchema = z.object({
  role: z.nativeEnum(Roles),
  skills: z.array(z.string()),
  limit: z.number().int().nonnegative().default(0),
  page: z.number().int().positive().default(1),
});

export const TaskByPrioritySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: z.object({
    priorityName: z.nativeEnum(TaskPriorityEnum),
  }),
  status: z.object({
    statusName: z.nativeEnum(TaskStatusEnum),
  }),
  createdByUser: z
    .object({
      firstName: z.string(),
      lastName: z.string(),
    })
    .nullable(),
  createdByClient: z
    .object({
      contactName: z.string().nullable(),
      companyName: z.string(),
    })
    .nullable(),
  taskCategory: z.object({
    categoryName: z.string(),
  }),
  dueDate: z.string(),
});

export type TaskByPriority = z.infer<typeof TaskByPrioritySchema>;

export const TasksResponseSchema = errorSchema.merge(
  z.object({
    tasks: z.array(TaskByPrioritySchema),
  })
);

export type TasksResponse = z.infer<typeof TasksResponseSchema>;
