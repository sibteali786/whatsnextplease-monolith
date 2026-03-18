'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  AdvancedFilterCondition,
  AdvancedFilterQuery,
  validateCondition,
} from '@/types/advancedFilter';
import { taskApiClient } from '@/utils/taskApi';
import { useToast } from './use-toast';
import { TaskStatusEnum } from '@prisma/client';

function mergeKanbanColumns(prev: any, newData: any, status?: TaskStatusEnum) {
  if (!prev) return newData;

  if (!status) return prev;

  const previousColumn = prev[status] || { tasks: [], count: 0 };
  const newColumn = newData[status] || { tasks: [], count: 0 };

  return {
    ...prev,
    [status]: {
      ...previousColumn,
      tasks: [...previousColumn.tasks, ...newColumn.tasks],
      count: newColumn.count ?? previousColumn.count,
    },
  };
}

export interface UseAdvancedFilterResult {
  // Filter state
  conditions: AdvancedFilterCondition[];
  logicalOperator: 'AND' | 'OR';

  // Filter manipulation
  addCondition: (condition: AdvancedFilterCondition) => void;
  removeCondition: (index: number) => void;
  updateCondition: (index: number, condition: AdvancedFilterCondition) => void;
  setLogicalOperator: (operator: 'AND' | 'OR') => void;
  clearFilters: () => void;

  // Search
  executeSearch: () => Promise<void>;
  isSearching: boolean;
  searchResults: any[] | null;
  hasNextCursor: boolean;
  nextCursor: string | null;
  loadMore: (extra?: { status?: TaskStatusEnum }) => Promise<void>; // extra is for kanban to specify column
  // validation
  getConditionError: (index: number) => string | null;
  canSearch: boolean;
  loading: boolean;
  filtersCleared: boolean;
}

export function useAdvancedFilter({
  view,
}: {
  view?: 'list' | 'timeline' | 'kanban';
}): UseAdvancedFilterResult {
  const { toast } = useToast();

  // Filter State
  const [conditions, setConditions] = useState<AdvancedFilterCondition[]>([]);
  const [logicalOperator, setLogicalOperatorState] = useState<'AND' | 'OR'>('AND');
  const [loading, setLoading] = useState(false);
  // Search State
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [hasNextCursor, setHasNextCursor] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filtersCleared, setfiltersCleared] = useState(true);
  // Add condition
  const addCondition = useCallback(
    (condition: AdvancedFilterCondition) => {
      const validation = validateCondition(condition);
      if (!validation.valid) {
        toast({
          title: 'Invalid Condition',
          description: validation.error,
          variant: 'destructive',
        });
        return;
      }

      setConditions(prev => {
        if (prev.length >= 15) {
          toast({
            title: 'Maximum Conditions Reached',
            description: 'You can add up to 15 filter conditions',
            variant: 'destructive',
          });
          return prev; // Don't add, return unchanged
        }

        const newConditions = [...prev, condition];
        return newConditions;
      });
    },
    [toast]
  );

  // Remove condition
  const removeCondition = useCallback((index: number) => {
    setConditions(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Update condition
  const updateCondition = useCallback(
    (index: number, condition: AdvancedFilterCondition) => {
      const validation = validateCondition(condition);
      if (!validation.valid) {
        toast({
          title: 'Invalid Condition',
          description: validation.error,
          variant: 'destructive',
        });
        return;
      }

      setConditions(prev => prev.map((c, i) => (i === index ? condition : c)));
    },
    [toast]
  );

  // Set logical operator
  const setLogicalOperator = useCallback((operator: 'AND' | 'OR') => {
    setLogicalOperatorState(operator);
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setConditions([]);
    setSearchResults([]);
    setNextCursor(null);
    setHasNextCursor(false);
  }, []);

  // Execute search
  const executeSearch = useCallback(async () => {
    if (conditions.length === 0) {
      toast({
        title: 'No Filters',
        description: 'Please add at least one filter condition',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    setLoading(true);
    try {
      const query: AdvancedFilterQuery = {
        conditions,
        logicalOperator,
        pageSize: 10,
        view,
      };

      const result = await taskApiClient.advancedSearch(query);

      if (result.success) {
        setSearchResults(result.tasks);
        setHasNextCursor(result.hasNextCursor);
        setNextCursor(result.nextCursor);

        const totalTasks = Array.isArray(result.tasks)
          ? result.tasks.length
          : Object.values(result.tasks as Record<string, { count?: number }>).reduce(
              (sum, column) => sum + (column.count ?? 0),
              0
            );

        toast({
          title: 'Search Complete',
          description: `Found ${totalTasks} tasks`,
        });
      }
    } catch (error) {
      console.error('Advanced search failed:', error);
      toast({
        title: 'Search Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
      setLoading(false);
    }
  }, [conditions, logicalOperator, toast]);

  // Load more results
  const loadMore = useCallback(
    async (extra?: { status?: TaskStatusEnum }) => {
      if (!nextCursor || isSearching) return;

      setIsSearching(true);
      try {
        const viewTemp = view ?? 'list';
        const query: AdvancedFilterQuery = {
          conditions,
          logicalOperator,
          cursor: nextCursor,
          pageSize: 10,
          view: viewTemp,
          status: extra?.status, // NEW: Pass status if provided for loading more in a specific column
        };
        const result = await taskApiClient.advancedSearch(query);

        if (result.success) {
          /*      setSearchResults(prev => [...(prev || []), ...result.tasks]); */

          setSearchResults(prev => {
            if (viewTemp === 'kanban') {
              return mergeKanbanColumns(prev, result.tasks, extra?.status);
            }
            return [...(prev || []), ...result.tasks];
          });
          setHasNextCursor(result.hasNextCursor);
          setNextCursor(result.nextCursor);
        }
      } catch (error) {
        console.error('Load more failed:', error);
        toast({
          title: 'Failed to Load More',
          description: error instanceof Error ? error.message : 'An error occurred',
          variant: 'destructive',
        });
      } finally {
        setIsSearching(false);
      }
    },
    [conditions, logicalOperator, nextCursor, isSearching, toast, view]
  );

  // Get validation error for a condition
  const getConditionError = useCallback(
    (index: number): string | null => {
      // Access conditions from state directly instead of closure
      const condition = conditions[index];
      if (!condition) return null;

      const validation = validateCondition(condition);
      return validation.valid ? null : validation.error || 'Invalid condition';
    },
    [conditions]
  );

  // Check if search can be executed
  const canSearch =
    conditions.length > 0 &&
    conditions.every(condition => {
      const validation = validateCondition(condition);
      return validation.valid;
    });

  useEffect(() => {
    if (conditions.length > 0) {
      setfiltersCleared(false);
    } else {
      setfiltersCleared(true);
    }
  }, [conditions]);

  return {
    conditions,
    logicalOperator,
    addCondition,
    removeCondition,
    updateCondition,
    setLogicalOperator,
    clearFilters,
    executeSearch,
    isSearching,
    searchResults,
    hasNextCursor,
    nextCursor,
    loadMore,
    getConditionError,
    canSearch,
    loading,
    filtersCleared,
  };
}
