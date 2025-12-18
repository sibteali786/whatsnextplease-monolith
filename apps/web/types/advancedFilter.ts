import { TaskStatusEnum, TaskPriorityEnum } from '@prisma/client';

// ============================================================================
// FRONTEND TYPES (Mirror backend types)
// ============================================================================

export type FilterFieldType = 'string' | 'uuid' | 'enum' | 'date' | 'number' | 'user-search';

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'notIn'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'isNull'
  | 'isNotNull';
export interface FilterFieldConfig {
  type: FilterFieldType;
  operators: readonly FilterOperator[];
  description: string;
  enumValues?: readonly string[];
}
export const FILTER_FIELDS: Record<string, FilterFieldConfig> = {
  title: {
    type: 'string',
    operators: ['contains', 'eq', 'startsWith', 'endsWith'],
    description: 'Task Title',
  },
  description: {
    type: 'string',
    operators: ['contains', 'eq'],
    description: 'Task Description',
  },
  'status.statusName': {
    type: 'enum',
    operators: ['eq', 'neq', 'in', 'notIn'],
    description: 'Task Status',
    enumValues: Object.values(TaskStatusEnum),
  },
  'priority.priorityName': {
    type: 'enum',
    operators: ['eq', 'neq', 'in', 'notIn'],
    description: 'Task Priority',
    enumValues: Object.values(TaskPriorityEnum),
  },
  assignedToId: {
    type: 'user-search',
    operators: ['eq', 'neq', 'in', 'isNull', 'isNotNull'],
    description: 'Assigned To',
  },
  taskCategoryId: {
    type: 'uuid',
    operators: ['eq', 'in'],
    description: 'Task Category',
  },
  createdByUserId: {
    type: 'uuid',
    operators: ['eq', 'in', 'isNull'],
    description: 'Created By User',
  },
  createdByClientId: {
    type: 'uuid',
    operators: ['eq', 'in', 'isNull'],
    description: 'Created By Client',
  },
  dueDate: {
    type: 'date',
    operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between', 'isNull'],
    description: 'Due Date',
  },
  createdAt: {
    type: 'date',
    operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
    description: 'Created Date',
  },
  updatedAt: {
    type: 'date',
    operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
    description: 'Updated Date',
  },
  timeForTask: {
    type: 'number',
    operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
    description: 'Estimated Time (hours)',
  },
} as const;

export interface AdvancedFilterCondition {
  field: string;
  operator: FilterOperator;
  value?: string | string[] | number | Date | [Date, Date] | null;
}

export interface AdvancedFilterQuery {
  conditions: AdvancedFilterCondition[];
  logicalOperator: 'AND' | 'OR';
  cursor?: string;
  pageSize?: number;
  orderBy?: {
    field: 'createdAt' | 'updatedAt' | 'dueDate' | 'title';
    direction: 'asc' | 'desc';
  };
}

// ============================================================================
// OPERATOR LABELS FOR UI
// ============================================================================

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  eq: 'eq',
  neq: 'not equals',
  contains: 'contains',
  startsWith: 'starts with',
  endsWith: 'ends with',
  in: 'is one of',
  notIn: 'is not one of',
  gt: 'greater than',
  gte: 'greater than or equal',
  lt: 'less than',
  lte: 'less than or equal',
  between: 'between',
  isNull: 'is empty',
  isNotNull: 'is not empty',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get available operators for a field
 */
export function getAvailableOperators(field: string): FilterOperator[] {
  const fieldConfig = FILTER_FIELDS[field];
  return fieldConfig ? [...fieldConfig.operators] : [];
}

/**
 * Get field type
 */
export function getFieldType(field: string): FilterFieldType | null {
  return FILTER_FIELDS[field]?.type || null;
}

/**
 * Check if operator requires value input
 */
export function operatorRequiresValue(operator: FilterOperator): boolean {
  return operator !== 'isNull' && operator !== 'isNotNull';
}

/**
 * Check if operator requires array input
 */
export function operatorRequiresArray(operator: FilterOperator): boolean {
  return operator === 'in' || operator === 'notIn';
}

/**
 * Check if operator requires date range
 */
export function operatorRequiresDateRange(operator: FilterOperator): boolean {
  return operator === 'between';
}

/**
 * Validate a condition
 */
export function validateCondition(condition: AdvancedFilterCondition): {
  valid: boolean;
  error?: string;
} {
  const fieldConfig = FILTER_FIELDS[condition.field];

  if (!fieldConfig) {
    return { valid: false, error: `Invalid field: ${condition.field}` };
  }

  if (!fieldConfig.operators.includes(condition.operator)) {
    return {
      valid: false,
      error: `Operator '${condition.operator}' not allowed for field '${condition.field}'`,
    };
  }

  // Check if value is required but missing
  if (operatorRequiresValue(condition.operator) && condition.value === undefined) {
    return { valid: false, error: 'Value is required for this operator' };
  }

  // Type-specific validation
  if (operatorRequiresArray(condition.operator) && !Array.isArray(condition.value)) {
    return { valid: false, error: 'Value must be an array for this operator' };
  }

  if (operatorRequiresDateRange(condition.operator)) {
    if (!Array.isArray(condition.value) || condition.value.length !== 2) {
      return { valid: false, error: 'Two dates required for between operator' };
    }
  }

  return { valid: true };
}

/**
 * Format condition for display
 */
export function formatConditionForDisplay(condition: AdvancedFilterCondition): string {
  const fieldConfig = FILTER_FIELDS[condition.field];
  const fieldLabel = fieldConfig?.description || condition.field;
  const operatorLabel = OPERATOR_LABELS[condition.operator];

  if (!operatorRequiresValue(condition.operator)) {
    return `${fieldLabel} ${operatorLabel}`;
  }

  let valueStr = '';
  if (Array.isArray(condition.value)) {
    if (condition.value.length === 2 && operatorRequiresDateRange(condition.operator)) {
      valueStr = `${new Date(condition.value[0]).toLocaleDateString()} and ${new Date(condition.value[1]).toLocaleDateString()}`;
    } else {
      valueStr = condition.value.join(', ');
    }
  } else if (condition.value instanceof Date) {
    valueStr = condition.value.toLocaleDateString();
  } else {
    valueStr = String(condition.value);
  }

  return `${fieldLabel} ${operatorLabel} "${valueStr}"`;
}
