'use client';

import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useAdvancedFilter, UseAdvancedFilterResult } from '@/hooks/useAdvancedFilter';

const AdvancedFilterContext = createContext<UseAdvancedFilterResult | null>(null);

export function AdvancedFilterProvider({ children }: { children: ReactNode }) {
  const filterState = useAdvancedFilter();

  // Debug: Log when provider mounts/unmounts
  useEffect(() => {
    console.log('🔥 AdvancedFilterProvider MOUNTED');
    return () => {
      console.log('💀 AdvancedFilterProvider UNMOUNTED');
    };
  }, []);

  // Debug: Log when conditions change in provider
  useEffect(() => {
    console.log('📦 Provider sees conditions change:', filterState.conditions.length);
  }, [filterState.conditions]);

  return (
    <AdvancedFilterContext.Provider value={filterState}>{children}</AdvancedFilterContext.Provider>
  );
}

export function useAdvancedFilterContext() {
  const context = useContext(AdvancedFilterContext);
  if (!context) {
    throw new Error('useAdvancedFilterContext must be used within AdvancedFilterProvider');
  }
  return context;
}
