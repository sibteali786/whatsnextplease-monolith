'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, AlertTriangle } from 'lucide-react';
import { TaskTable } from '@/utils/validationSchemas';

interface BatchDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTasks: TaskTable[];
  onBatchDelete: (taskIds: string[]) => Promise<void>;
}

export function BatchDeleteDialog({
  open,
  onOpenChange,
  selectedTasks,
  onBatchDelete,
}: BatchDeleteDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const taskIds = selectedTasks.map(task => task.id);
      await onBatchDelete(taskIds);
      onOpenChange(false);
    } catch (error) {
      console.error('Batch delete failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const taskCount = selectedTasks.length;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete {taskCount} Task{taskCount > 1 ? 's' : ''}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the selected task
            {taskCount > 1 ? 's' : ''} and remove {taskCount > 1 ? 'them' : 'it'} from our data
            store.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="max-h-32 overflow-y-auto">
          <div className="text-sm text-muted-foreground">Tasks to be deleted:</div>
          <ul className="text-sm mt-2 space-y-1">
            {selectedTasks.slice(0, 5).map(task => (
              <li key={task.id} className="truncate">
                • {task.title}
              </li>
            ))}
            {taskCount > 5 && (
              <li className="text-muted-foreground">... and {taskCount - 5} more</li>
            )}
          </ul>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Tasks'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
