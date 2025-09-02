import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare } from 'lucide-react';

const LoadingChat = () => {
  return (
    <div className="h-full w-full rounded-lg border bg-card p-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between pb-3 border-b mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-muted-foreground animate-pulse" />
          <Skeleton className="w-32 h-5" />
          <Skeleton className="w-16 h-4 rounded-full" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="w-8 h-7 rounded" />
          <Skeleton className="w-12 h-7 rounded" />
        </div>
      </div>

      {/* Chat content skeleton */}
      <div className="space-y-4">
        {/* Message bubbles */}
        <div className="flex gap-3">
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="w-1/4 h-3" />
            <Skeleton className="w-3/4 h-10 rounded-lg" />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <div className="space-y-2 flex-1 flex flex-col items-end">
            <Skeleton className="w-1/4 h-3" />
            <Skeleton className="w-2/3 h-8 rounded-lg" />
          </div>
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
        </div>

        <div className="flex gap-3">
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="w-1/4 h-3" />
            <Skeleton className="w-1/2 h-6 rounded-lg" />
            <Skeleton className="w-4/5 h-6 rounded-lg" />
          </div>
        </div>

        {/* Input area skeleton */}
        <div className="mt-8 pt-4 border-t">
          <div className="flex gap-2">
            <Skeleton className="flex-1 h-10 rounded-lg" />
            <Skeleton className="w-10 h-10 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingChat;
