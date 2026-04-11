// utils/clientUserUtils.ts
import { useState, useEffect } from 'react';
import { apiClient, ApiError } from '@/lib/apiClient';
import {
  ClientProfileType,
  GetUserProfileStateResponse,
  UserProfileType,
} from '@/types/tasks/api-response';

export interface CurrentUserResponse {
  success: boolean;
  user?: UserProfileType | ClientProfileType;
  error?: string;
}

/**
 * Fetch current authenticated user from API route
 * This replaces the server action approach and can be used in client components
 */
export const getCurrentUserClient = async (): Promise<CurrentUserResponse> => {
  try {
    const { success, data } = await apiClient.get<GetUserProfileStateResponse>('/auth/me');
    if (!success || !data) {
      return { success: false, error: 'Failed to fetch user data' };
    }
    const entity = data.user ?? data.client;

    if (!entity) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, user: entity };
  } catch (error) {
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Failed to fetch user data',
    };
  }
};

/**
 * React hook to get current user with loading, error states, and retry logic
 * @returns Object containing user data, loading state, error, and retry function
 */
export const useCurrentUser = () => {
  const [user, setUser] = useState<UserProfileType | ClientProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const fetchUser = async (currentRetryCount = 0) => {
    try {
      setLoading(true);
      setError(null); // Clear previous error on retry

      const response = await getCurrentUserClient();

      if (response.success && response.user) {
        setUser(response.user);
        setError(null);
        setRetryCount(0); // Reset retry count on success
      } else {
        throw new Error(response.error || 'Failed to fetch user');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';

      if (currentRetryCount < maxRetries) {
        // Auto-retry up to maxRetries times
        const nextRetryCount = currentRetryCount + 1;

        setRetryCount(nextRetryCount);

        setTimeout(() => {
          fetchUser(nextRetryCount);
        }, 1000 * nextRetryCount); // Exponential backoff: 1s, 2s, 3s
      } else {
        setError(errorMessage);
        setUser(null);
        setRetryCount(maxRetries); // Set to maxRetries to trigger toast
      }
    } finally {
      setLoading(false);
    }
  };

  const manualRetry = () => {
    setRetryCount(0); // Reset retry count for manual retry
    setError(null);
    fetchUser(0);
  };

  useEffect(() => {
    fetchUser(0);
  }, []);

  return {
    user,
    loading,
    error,
    retryCount,
    maxRetries,
    refetch: manualRetry,
  };
};

/**
 * Check if user has specific role
 * @param user - Current user object
 * @param requiredRole - Role to check against
 */
export const hasRole = (
  user: UserProfileType | ClientProfileType | undefined,
  requiredRole: string
): boolean => {
  return user?.role?.name === requiredRole;
};

/**
 * Check if user has any of the specified roles
 * @param user - Current user object
 * @param roles - Array of roles to check against
 */
export const hasAnyRole = (
  user: UserProfileType | ClientProfileType | undefined,
  roles: string[]
): boolean => {
  return roles.includes(user?.role?.name as string);
};
