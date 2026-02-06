'use client';

import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface WorkLogEmptyStateProps {
  onLogTime: () => void;
}

export default function WorkLogEmptyState({ onLogTime }: WorkLogEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Icon */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <Clock className="w-12 h-12 text-primary" />
        </div>
        {/* Animated clock hands */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1 h-6 bg-primary rounded-full origin-bottom animate-pulse" />
        </div>
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold mb-2">No time logged yet</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        Track time spent on this task to monitor progress and generate accurate reports. Logging
        time helps you and your team understand effort distribution and estimate future work.
      </p>

      {/* CTA Button */}
      <Button onClick={onLogTime} size="lg">
        <Clock className="w-4 h-4 mr-2" />
        Log Time
      </Button>

      {/* Info */}
      <div className="mt-8 p-4 bg-muted rounded-lg max-w-md">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold">Tip:</span> You can log time for work completed on
          different dates and add detailed descriptions to track your activities.
        </p>
      </div>
    </div>
  );
}
