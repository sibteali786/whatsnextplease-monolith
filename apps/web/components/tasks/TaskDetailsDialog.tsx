'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CircleX, Info, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { taskPriorityColors, taskStatusColors } from '@/utils/commonClasses';
import { FileSchemaType, Task, TaskFile } from '@/utils/validationSchemas';
import { Prisma } from '@prisma/client';
import { formatNumbers } from '@/utils/utils';
import { TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tooltip } from '@radix-ui/react-tooltip';
import { getTaskById } from '@/db/repositories/tasks/getTaskById';
import { FileAttachmentsList } from '../files/FileAttachmentList';
import { useToast } from '@/hooks/use-toast';
import { getMimeType, sanitizeFileName } from '@/utils/fileUtils';
import { getCurrentUser, UserState } from '@/utils/user';

export default function TaskDetailsDialog({
  open,
  taskId,
  setOpen,
}: {
  open: boolean;
  taskId: string;
  setOpen: (open: boolean) => void;
}) {
  const [user, setUser] = useState<UserState>();
  const [taskDetails, setTaskDetails] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [loadingFileIds, setLoadingFileIds] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchTaskDetails() {
      if (!taskId || !open) return;
      const user = await getCurrentUser();
      if (user) {
        setUser(user);
      }
      try {
        setLoading(true);
        const { success, task } = await getTaskById(taskId);

        if (success && task) {
          setTaskDetails(task);
          // Check if taskFiles exist before setting
          if (task.taskFiles && task.taskFiles.length > 0) {
            setFiles(task.taskFiles);
          }
        }
      } catch (error) {
        console.error('Failed to fetch task details:', error);
        toast({
          variant: 'destructive',
          title: 'Error fetching task details',
          description: 'Failed to load task information',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchTaskDetails();
  }, [taskId, open, toast]);

  const timeForTask = taskDetails?.timeForTask
    ? new Prisma.Decimal(taskDetails?.timeForTask).toString()
    : '';
  const overTime = taskDetails?.overTime ? new Prisma.Decimal(taskDetails.overTime).toString() : '';
  // file download
  const [, startTransition] = useTransition();
  const handleDownload = async (file: FileSchemaType) => {
    setLoadingFileIds(prev => [...prev, file.id]);
    const fileKey = `tasks/${taskDetails?.id}/users/${user?.id}/${sanitizeFileName(file.fileName)}`;
    const fileType = getMimeType(file.fileName);
    startTransition(async () => {
      try {
        const response = await fetch('/api/file/downloadFileByName', {
          method: 'POST',
          body: JSON.stringify({ fileKey, fileType }),
        });

        const json = await response.json();

        if (json.success) {
          // Create temporary anchor element to trigger download
          const downloadLink = document.createElement('a');
          downloadLink.href = json.downloadUrl;
          downloadLink.setAttribute('download', file.fileName);
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        } else {
          toast({
            title: 'Download Failed',
            description: json.message,
            variant: 'destructive',
            icon: <CircleX size={40} />,
          });
        }
      } catch (error) {
        if (error instanceof Error) {
          toast({
            title: 'Error',
            description: error.message || 'An error occurred while downloading the file.',
            variant: 'destructive',
            icon: <CircleX size={40} />,
          });
        }
      } finally {
        setLoadingFileIds(prev => prev.filter(id => id !== file.id));
      }
    });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[70%] p-6">
        <DialogHeader className="flex flex-row items-center justify-start gap-6">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <DialogTitle className="text-2xl">
            {loading ? <Loader2 className="animate-spin h-6 w-6" /> : 'Task Details'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-6">
            <div className="flex">
              <h3 className="font-semibold w-1/4">Task Name</h3>
              <p className="w-1/2">{taskDetails?.title}</p>
            </div>
            <Separator />
            <div className="flex">
              <h3 className="font-semibold w-1/4">Description</h3>
              <p className="w-1/2">{taskDetails?.description}</p>
            </div>
            <Separator />
            <div className="flex">
              <h3 className="font-semibold w-1/4">Priority</h3>
              <Badge
                className={`${taskPriorityColors[taskDetails?.priority?.priorityName ?? 'NORMAL']} py-2 px-4`}
              >
                {taskDetails?.priority.priorityName}
              </Badge>
            </div>
            <Separator />
            <div className="flex">
              <h3 className="font-semibold w-1/4">Due Date</h3>
              <p className="w-1/2">
                {taskDetails?.dueDate
                  ? new Date(taskDetails?.dueDate).toLocaleDateString()
                  : 'No due date'}
              </p>
            </div>
            <Separator />
            <div className="flex justify-between">
              <div className="flex w-1/2">
                <div className="w-1/2 flex items-start gap-1">
                  <h3 className="font-semibold">Time For Task</h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>Time required for a task is in hours.</TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-start gap-2">
                  {formatNumbers(timeForTask)
                    .split('')
                    .map((digit, index) => (
                      <Button key={index} variant={'outline'} className="text-xl font-bold">
                        {digit !== '.' ? digit : ':'}
                      </Button>
                    ))}{' '}
                </div>
              </div>
              {taskDetails?.overTime ? (
                <div className="flex items-center w-1/2 justify-around">
                  <h3 className="font-semibold w-1/2">OverTime</h3>
                  <div className="flex gap-2">
                    {formatNumbers(overTime)
                      .split('')
                      .map((digit, index) => (
                        <Button key={index} variant={'outline'} className="text-xl font-bold">
                          {digit !== '.' ? digit : ':'}
                        </Button>
                      ))}
                  </div>
                </div>
              ) : null}
            </div>
            <Separator />
            <div className="flex">
              <h3 className="font-semibold w-1/4">Status</h3>
              <Badge
                className={`${taskStatusColors[taskDetails?.status?.statusName ?? 'NEW']} py-2 px-4`}
              >
                {taskDetails?.status.statusName}
              </Badge>
            </div>
            <Separator />

            {/* Show Task Attachments if any */}
            {!loading && files.length > 0 && (
              <FileAttachmentsList
                files={files}
                onDownload={handleDownload}
                // onDelete={(fileId) => handleDelete(fileId)}
                loadingFileIds={loadingFileIds}
              />
            )}
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
