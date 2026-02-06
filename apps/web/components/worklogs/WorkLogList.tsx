'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, Loader2 } from 'lucide-react';
import WorkLogItem from './WorkLogItem';
import { useToast } from '@/hooks/use-toast';
import WorkLogForm from './WorkLogForm';
import { WorkLog, workLogApiClient } from '@/utils/time/worklogApiClient';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

interface WorkLogListProps {
  taskId: string;
  workLogs: WorkLog[];
  onWorkLogsUpdate: (workLogs: WorkLog[], hasMore: boolean, nextCursor: string | null) => void;
  totalCount: number;
  hasMore: boolean;
  nextCursor: string | null;
  verboseTime?: boolean;
  taskTimeForTask?: number | null;
  taskTotalTimeSpent?: number | null;
}

export default function WorkLogList({
  taskId,
  workLogs,
  onWorkLogsUpdate,
  totalCount,
  hasMore,
  nextCursor,
  verboseTime = false,
  taskTimeForTask,
  taskTotalTimeSpent,
}: WorkLogListProps) {
  const [loadingMore, setLoadingMore] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [editingWorkLog, setEditingWorkLog] = useState<WorkLog | undefined>(undefined);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [workLogToDelete, setWorkLogToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const handleLoadMore = async () => {
    if (!hasMore || !nextCursor || loadingMore) return;

    setLoadingMore(true);

    try {
      const result = await workLogApiClient.getWorkLogs(taskId, nextCursor, 5);

      if (result.success && result.workLogs) {
        onWorkLogsUpdate(
          [...workLogs, ...result.workLogs],
          result.hasNextCursor || false,
          result.nextCursor || null
        );
      } else {
        toast({
          title: 'Load Failed',
          description: result.error || 'Failed to load more work logs',
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
      setLoadingMore(false);
    }
  };

  const handleEdit = (workLog: WorkLog) => {
    setEditingWorkLog(workLog);
    setShowEditDialog(true);
  };

  const handleDelete = async (workLogId: string) => {
    // Open the confirmation dialog
    setWorkLogToDelete(workLogId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!workLogToDelete) return;

    setIsDeleting(true);
    setDeletingIds(prev => [...prev, workLogToDelete]);

    try {
      const result = await workLogApiClient.deleteWorkLog(workLogToDelete);

      if (result.success) {
        // Remove from list
        onWorkLogsUpdate(
          workLogs.filter(wl => wl.id !== workLogToDelete),
          hasMore,
          nextCursor
        );
        toast({
          title: 'Work Log Deleted',
          description: 'The time entry has been deleted successfully',
          variant: 'success',
        });
      } else {
        toast({
          title: 'Delete Failed',
          description: result.error || 'Failed to delete work log',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete work log',
        variant: 'destructive',
      });
    } finally {
      setDeletingIds(prev => prev.filter(id => id !== workLogToDelete));
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setWorkLogToDelete(null);
    }
  };
  const handleWorkLogUpdated = (updatedWorkLog: WorkLog) => {
    // Update the work log in the list
    onWorkLogsUpdate(
      workLogs.map(wl => (wl.id === updatedWorkLog.id ? updatedWorkLog : wl)),
      hasMore,
      nextCursor
    );
    setShowEditDialog(false);
    setEditingWorkLog(undefined);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Work logs count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {totalCount} time {totalCount !== 1 ? 'entries' : 'entry'}
          </p>
        </div>

        {/* Work logs list */}
        <div className="space-y-3">
          {workLogs.map(workLog => (
            <WorkLogItem
              key={workLog.id}
              workLog={workLog}
              onEdit={handleEdit}
              onDelete={handleDelete}
              deleting={deletingIds.includes(workLog.id)}
              verboseTime={verboseTime}
              totalTimeSpent={taskTotalTimeSpent}
              taskTimeForTask={taskTimeForTask}
            />
          ))}
        </div>

        {/* Load more button */}
        {hasMore && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="flex items-center gap-2"
            >
              {loadingMore ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Load More
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {editingWorkLog && (
        <WorkLogForm
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          taskId={taskId}
          onWorkLogAdded={handleWorkLogUpdated}
          editingWorkLog={editingWorkLog}
          taskTimeForTask={taskTimeForTask}
          // Subtract the editing entry's own timeSpent to avoid double-counting
          // e.g. total=7h, editing entry=5h → pass 2h so form adds back whatever user types
          taskTotalTimeSpent={(taskTotalTimeSpent || 0) - (editingWorkLog.timeSpent || 0)}
        />
      )}

      {/* Alert Dialog for deleting confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This action <span className="font-semibold">cannot be undone</span>. This will
                permanently delete your worklog.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete()}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Worklog'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
