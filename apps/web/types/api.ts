/* eslint-disable @typescript-eslint/no-explicit-any */
// Pattern for all responses
export interface StandardApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  count?: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedApiResponse<T = any> extends StandardApiResponse<T> {
  nextCursor?: string;
  hasNextCursor?: boolean;
  totalCount?: number;
  hasMore?: boolean;
  level?: string;
  prioritiesIncluded?: string;
}
