import { z } from 'zod';
import { TaskStatusEnum, TaskPriorityEnum } from '@prisma/client';

export const ALLOWED_FILTER_FIELDS = {
  title: {
    type: 'string',
    operators: ['contains', 'equals', 'startsWith', 'endsWith'] as const,
    description: 'Task Title',
  },
  description: {
    type: 'string',
    operators: ['contains', 'equals'] as const,
    description: 'Task Description',
  },
  // Enum Fields
  'status.statusName': {
    type: 'enum',
    operators: ['equals', 'notEquals', 'in', 'notIn'] as const,
    description: 'Task Status',
    enumValues: Object.values(TaskStatusEnum),
  },
  'priority.priorityName': {
    type: 'enum',
    operators: ['equals', 'notEquals', 'in', 'notIn'] as const,
    description: 'Task Priority',
    enumValues: Object.values(TaskPriorityEnum),
  },

  // UUID Fields
  assignedToId: {
    type: 'uuid',
    operators: ['equals', 'notEquals', 'isNull', 'isNotNull'] as const,
    description: 'Assigned user ID',
  },
  taskCategoryId: {
    type: 'uuid',
    operators: ['equals', 'in'],
    description: 'Task Category ID',
  },
  createdByUserId: {
    type: 'uuid',
    operators: ['equals', 'in', 'isNull'],
    description: 'Created by user ID',
  },
  createdByClientId: {
    type: 'uuid',
    operators: ['equals', 'in', 'isNull'],
    description: 'Created by client ID',
  },
  // Date fields
  dueDate: {
    type: 'date',
    operators: ['equals', 'gt', 'gte', 'lt', 'lte', 'between', 'isNull'] as const,
    description: 'Task due date',
  },
  createdAt: {
    type: 'date',
    operators: ['equals', 'gt', 'gte', 'lt', 'lte', 'between'] as const,
    description: 'Task creation date',
  },
  updatedAt: {
    type: 'date',
    operators: ['equals', 'gt', 'gte', 'lt', 'lte', 'between'] as const,
    description: 'Task update date',
  },

  // Number fields
  timeForTask: {
    type: 'number',
    operators: ['equals', 'gt', 'gte', 'lt', 'lte', 'between'] as const,
    description: 'Estimated time (hours)',
  },
} as const;

export type AllowedField = keyof typeof ALLOWED_FILTER_FIELDS;
export type AllowedOperator = (typeof ALLOWED_FILTER_FIELDS)[AllowedField]['operators'][number];
// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

// Operator-specific value schemas
const stringValueSchema = z.string().min(1).max(255);
const uuidValueSchema = z.string().uuid();
const dateValueSchema = z.coerce.date();
const numberValueSchema = z.number();
const enumValueSchema = z.string();
export const advancedFilterConditionSchema = z
  .object({
    field: z.enum(Object.keys(ALLOWED_FILTER_FIELDS) as [AllowedField, ...AllowedField[]]),
    operator: z.enum([
      'equals',
      'notEquals',
      'contains',
      'startsWith',
      'endsWith',
      'in',
      'notIn',
      'gt',
      'gte',
      'lt',
      'lte',
      'between',
      'isNull',
      'isNotNull',
    ]),
    value: z
      .union([
        stringValueSchema,
        uuidValueSchema,
        dateValueSchema,
        numberValueSchema,
        z.array(z.union([stringValueSchema, uuidValueSchema, enumValueSchema])),
        z.tuple([dateValueSchema, dateValueSchema]), // For 'between'
        z.null(), // For 'isNull' / 'isNotNull'
      ])
      .optional(),
  })
  .refine(
    data => {
      // Validate operator is allowed for field
      const fieldConfig = ALLOWED_FILTER_FIELDS[data.field];
      if (!fieldConfig) return false;

      return fieldConfig.operators.includes(data.operator as any);
    },
    {
      message: 'Operator not allowed for this field',
    }
  );
// Main advanced filter query schema
export const advancedFilterQuerySchema = z.object({
  conditions: z
    .array(advancedFilterConditionSchema)
    .min(1, 'At least one condition is required')
    .max(15, 'Maximum 15 conditions allowed'),
  logicalOperator: z.enum(['AND', 'OR']).default('AND'),
  // Standard pagination
  cursor: z.string().optional(),
  pageSize: z.number().int().min(1).max(100).default(10),
  // Optional sorting
  orderBy: z
    .object({
      field: z.enum(['createdAt', 'updatedAt', 'dueDate', 'title']),
      direction: z.enum(['asc', 'desc']),
    })
    .optional(),
});
// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export type AdvancedFilterCondition = z.infer<typeof advancedFilterConditionSchema>;
export type AdvancedFilterQuery = z.infer<typeof advancedFilterQuerySchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export class AdvancedFilterValidator {
  /**
   * Validate a single filter condition
   */
  static validateCondition(condition: AdvancedFilterCondition): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const fieldConfig = ALLOWED_FILTER_FIELDS[condition.field];

    if (!fieldConfig) {
      errors.push(`Invalid field: ${condition.field}`);
      return { valid: false, errors };
    }

    // Check if operator is allowed for this field
    if (!fieldConfig.operators.includes(condition.operator as any)) {
      errors.push(
        `Invalid operator '${condition.operator}' for field '${condition.field}'. ` +
          `Allowed: ${fieldConfig.operators.join(', ')}`
      );
    }

    // Type-specific validation
    switch (fieldConfig.type) {
      case 'uuid':
        if (condition.operator === 'in' && !Array.isArray(condition.value)) {
          errors.push(`Operator 'in' requires an array of UUIDs`);
        }
        break;

      case 'date':
        if (condition.operator === 'between') {
          if (!Array.isArray(condition.value) || condition.value.length !== 2) {
            errors.push(`Operator 'between' requires an array of 2 dates`);
          }
        }
        break;

      case 'enum':
        if (condition.operator === 'in' || condition.operator === 'notIn') {
          if (!Array.isArray(condition.value)) {
            errors.push(`Operator '${condition.operator}' requires an array of values`);
          }
        }
        break;
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate entire filter query
   */
  static validateQuery(query: AdvancedFilterQuery): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate each condition
    for (let i = 0; i < query.conditions.length; i++) {
      const result = this.validateCondition(query.conditions[i]);
      if (!result.valid) {
        errors.push(`Condition ${i + 1}: ${result.errors.join(', ')}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
