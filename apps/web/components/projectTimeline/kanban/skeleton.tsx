'use client';

import { Skeleton } from '@/components/ui/skeleton';

const COLUMN_COUNT = 5;
const CARDS_PER_COLUMN = 4;

const KanbanSkeleton = () => {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: COLUMN_COUNT }).map((_, colIdx) => (
        <div key={colIdx} className="min-w-[280px] rounded-lg border bg-background p-3">
          {/* Column header */}
          <Skeleton className="mb-4 h-5 w-2/3" />

          {/* Cards */}
          <div className="flex flex-col gap-3">
            {Array.from({ length: CARDS_PER_COLUMN }).map((_, cardIdx) => (
              <Skeleton key={cardIdx} className="h-20 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KanbanSkeleton;
