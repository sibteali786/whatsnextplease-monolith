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
} from '../../ui/alert-dialog';
import { deleteTaskById } from '@/db/repositories/tasks/deleteTaskById';
import { toast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const DeleteTaskDialog = ({
  setIsDeleteDialogOpen,
  isDeleteDialogOpen,
  taskId,
  onReload,
}: {
  setIsDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isDeleteDialogOpen: boolean;
  taskId: string;
  onReload?: () => void;
}) => {
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  const confirmDeleteTask = async () => {
    setIsDeletingTask(true);
    try {
      const response = await deleteTaskById(taskId);

      if (response.success) {
        toast({
          title: 'Task deleted',
          description: 'The task has been successfully deleted',
          variant: 'success',
          icon: <CheckCircle className="h-4 w-4" />,
        });

        if (onReload) {
          await onReload();
        }
      } else {
        toast({
          title: 'Failed to delete task',
          description: response.message || 'An error occurred while deleting the task',
          variant: 'destructive',
          icon: <AlertCircle className="h-4 w-4" />,
        });
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
        icon: <AlertCircle className="h-4 w-4" />,
      });
    } finally {
      setIsDeletingTask(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to delete this task?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the task and remove it from
            our data store.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeletingTask}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={e => {
              e.preventDefault();
              confirmDeleteTask();
            }}
            disabled={isDeletingTask}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeletingTask ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteTaskDialog;
