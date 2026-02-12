'use client';

import { Skeleton } from '@/components/ui/skeleton';

const GanttSkeleton = () => {
  return (
    <div className="p-4 space-y-4">
      {/* Timeline rows */}
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
};

export default GanttSkeleton;
