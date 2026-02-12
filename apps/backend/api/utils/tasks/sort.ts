import { Prisma, SortDirection, TaskSortField } from '@prisma/client';

export function parseSortByParam(
  sortBy?: string
): { field: TaskSortField; direction: SortDirection } | undefined {
  if (!sortBy) return undefined;

  const [fieldRaw, directionRaw] = sortBy.split('-');

  if (!Object.values(TaskSortField).includes(fieldRaw as TaskSortField)) return undefined;

  const direction = directionRaw === 'DESC' ? SortDirection.DESC : SortDirection.ASC;

  return {
    field: fieldRaw as TaskSortField,
    direction,
  };
}

export function mapSortByToOrderBy(sortBy?: {
  field: TaskSortField;
  direction: SortDirection;
}): Prisma.TaskOrderByWithRelationInput | undefined {
  if (!sortBy) return undefined;

  const order = sortBy.direction === SortDirection.DESC ? 'desc' : 'asc';

  switch (sortBy.field) {
    case TaskSortField.START_DATE:
      return { createdAt: order };

    case TaskSortField.END_DATE:
      return { dueDate: order };

    case TaskSortField.PRIORITY:
      return { priority: { priorityName: order } };

    default:
      return undefined;
  }
}
