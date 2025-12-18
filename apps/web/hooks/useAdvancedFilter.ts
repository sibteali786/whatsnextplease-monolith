'use client';

import { useState, useCallback } from 'react';
import {
  AdvancedFilterCondition,
  AdvancedFilterQuery,
  validateCondition,
} from '@/types/advancedFilter';
import { taskApiClient } from '@/utils/taskApi';
import { useToast } from './use-toast';

export interface UseAdvancedFilterResult {
  // Filter state
  conditions: AdvancedFilterCondition[];
  logicalOperator: 'AND' | 'OR';

  // Filter
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
  loadMore: () => Promise<void>;

  // validation
  getConditionError: (index: number) => string | null;
  canSearch: boolean;
}

export function useAdvancedFilter(): UseAdvancedFilterResult {
  const { toast } = useToast();

  // Filter State
  const [conditions, setConditions] = useState<AdvancedFilterCondition[]>([]);
  const [logicalOperator, setLogicalOperatorState] = useState<'AND' | 'OR'>('AND');

  // Search State
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [hasNextCursor, setHasNextCursor] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Add condition
  // Add condition
  const addCondition = useCallback(
    (condition: AdvancedFilterCondition) => {
      console.log('=== addCondition called ===');
      console.log('Condition to add:', condition);

      const validation = validateCondition(condition);
      if (!validation.valid) {
        console.log('Validation failed:', validation.error);
        toast({
          title: 'Invalid Condition',
          description: validation.error,
          variant: 'destructive',
        });
        return;
      }

      setConditions(prev => {
        console.log('Previous conditions:', prev);
        console.log('Previous conditions length:', prev.length);

        if (prev.length >= 15) {
          toast({
            title: 'Maximum Conditions Reached',
            description: 'You can add up to 15 filter conditions',
            variant: 'destructive',
          });
          return prev; // Don't add, return unchanged
        }

        const newConditions = [...prev, condition];
        console.log('New conditions after add:', newConditions);
        console.log('New conditions length:', newConditions.length);
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
    setSearchResults(null);
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
    try {
      const query: AdvancedFilterQuery = {
        conditions,
        logicalOperator,
        pageSize: 10,
      };

      const result = await taskApiClient.advancedSearch(query);

      if (result.success) {
        setSearchResults(result.tasks);
        setHasNextCursor(result.hasNextCursor);
        setNextCursor(result.nextCursor);

        toast({
          title: 'Search Complete',
          description: `Found ${result.tasks.length} tasks`,
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
    }
  }, [conditions, logicalOperator, toast]);

  // Load more results
  const loadMore = useCallback(async () => {
    if (!nextCursor || isSearching) return;

    setIsSearching(true);
    try {
      const query: AdvancedFilterQuery = {
        conditions,
        logicalOperator,
        cursor: nextCursor,
        pageSize: 10,
      };

      const result = await taskApiClient.advancedSearch(query);

      if (result.success) {
        setSearchResults(prev => [...(prev || []), ...result.tasks]);
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
  }, [conditions, logicalOperator, nextCursor, isSearching, toast]);

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
  };
}
