'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAdvancedFilter, UseAdvancedFilterResult } from '@/hooks/useAdvancedFilter';

const AdvancedFilterContext = createContext<UseAdvancedFilterResult | null>(null);

export function AdvancedFilterProvider({
  children,
  view,
}: {
  children: ReactNode;
  view?: 'list' | 'timeline' | 'kanban';
}) {
  const filterState = useAdvancedFilter({ view });

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
