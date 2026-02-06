'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, ToggleLeft, ToggleRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import WorkLogForm from './WorkLogForm';
import WorkLogList from './WorkLogList';
import WorkLogEmptyState from './WorkLogEmptyState';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser } from '@/utils/user';
import { Roles } from '@prisma/client';
import { WorkLog, workLogApiClient } from '@/utils/time/worklogApiClient';
import { formatTimeFromMinutes } from '@/utils/time/timeUtils';

interface WorkLogSectionProps {
  taskId: string;
  totalTimeSpent?: number | null;
  latestTimeRemaining?: number | null;
  onDataChange?: () => void;
  taskTimeForTask?: number | null;
}

export default function WorkLogSection({
  taskId,
  totalTimeSpent,
  latestTimeRemaining,
  onDataChange,
  taskTimeForTask,
}: WorkLogSectionProps) {
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [verboseTime, setVerboseTime] = useState(false);
  const [localTimeSpent, setLocalTimeSpent] = useState<number>(0);

  const { toast } = useToast();

  // Determine default verbose setting based on role
  useEffect(() => {
    const setDefaultVerbose = async () => {
      const currentUser = await getCurrentUser();
      if (
        currentUser?.role?.name === Roles.SUPER_USER ||
        currentUser?.role?.name === Roles.TASK_SUPERVISOR ||
        currentUser?.role?.name === Roles.CLIENT
      ) {
        setVerboseTime(true);
      }
    };
    setDefaultVerbose();
  }, []);

  const loadWorkLogs = useCallback(async () => {
    try {
      setLoading(true);
      const result = await workLogApiClient.getWorkLogs(taskId, undefined, 5);

      if (result.success) {
        setWorkLogs(result.workLogs || []);
        setTotalCount(result.totalCount || 0);
        setHasMore(result.hasNextCursor || false);
        setNextCursor(result.nextCursor || null);

        setLocalTimeSpent(result.totalTimeSpent || 0);
      } else {
        toast({
          title: 'Load Failed',
          description: result.error || 'Failed to load work logs',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'An error occurred while loading work logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (taskId) {
      loadWorkLogs();
    }
  }, [taskId]);

  const handleWorkLogAdded = (newWorkLog: WorkLog) => {
    // Add new work log to the beginning of the list
    setWorkLogs(prev => [newWorkLog, ...prev]);
    setTotalCount(prev => prev + 1);

    setLocalTimeSpent(prev => prev + (newWorkLog.timeSpent || 0));
    setShowForm(false);

    // Notify parent to refresh task data (for aggregated values)
    if (onDataChange) {
      onDataChange();
    }
  };

  const handleWorkLogsUpdate = (
    updatedWorkLogs: WorkLog[],
    newHasMore: boolean,
    newNextCursor: string | null,
    serverTotalTimeSpent?: number
  ) => {
    setWorkLogs(updatedWorkLogs);
    setTotalCount(updatedWorkLogs.length);
    if (serverTotalTimeSpent !== undefined) {
      setLocalTimeSpent(serverTotalTimeSpent);
    }
    setHasMore(newHasMore);
    setNextCursor(newNextCursor);
    // Notify parent to refresh task data
    if (onDataChange) {
      onDataChange();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-24 w-full" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex gap-3 p-4 rounded-lg border">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Time Tracking</h3>
          {/* Time format toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVerboseTime(!verboseTime)}
            className="flex items-center gap-2"
          >
            {verboseTime ? (
              <>
                <ToggleRight className="w-6 h-6" />
                Verbose
              </>
            ) : (
              <>
                <ToggleLeft className="w-6 h-6" />
                Compact
              </>
            )}
          </Button>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Clock className="w-4 h-4 mr-2" />
          Log Time
        </Button>
      </div>

      {/* Summary */}
      {(totalTimeSpent !== null && totalTimeSpent !== undefined) ||
      (latestTimeRemaining !== null && latestTimeRemaining !== undefined) ? (
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-6 flex-wrap">
            {totalTimeSpent !== null && totalTimeSpent !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Total logged:</span>
                <Badge variant="secondary" className="font-mono">
                  {formatTimeFromMinutes(totalTimeSpent, verboseTime)}
                </Badge>
              </div>
            )}
            {latestTimeRemaining !== null && latestTimeRemaining !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Remaining:</span>
                <Badge variant="outline" className="font-mono">
                  {formatTimeFromMinutes(latestTimeRemaining, verboseTime)}
                </Badge>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <Separator />

      {/* Content */}
      {totalCount === 0 ? (
        <WorkLogEmptyState onLogTime={() => setShowForm(true)} />
      ) : (
        <WorkLogList
          taskId={taskId}
          workLogs={workLogs}
          onWorkLogsUpdate={handleWorkLogsUpdate}
          totalCount={totalCount}
          hasMore={hasMore}
          nextCursor={nextCursor}
          verboseTime={verboseTime}
          taskTimeForTask={taskTimeForTask}
          taskTotalTimeSpent={localTimeSpent}
          newTotal={localTimeSpent}
        />
      )}

      {/* Form Dialog */}
      <WorkLogForm
        open={showForm}
        onOpenChange={setShowForm}
        taskId={taskId}
        onWorkLogAdded={handleWorkLogAdded}
        taskTimeForTask={taskTimeForTask}
        taskTotalTimeSpent={localTimeSpent}
      />
    </div>
  );
}
