// components/tasks/TaskDetailsView.tsx
'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CircleX, Info, Loader2, ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { taskPriorityColors, taskStatusColors } from '@/utils/taskUtilColorClasses';
import { FileSchemaType, Task, TaskFile } from '@/utils/validationSchemas';
import { Prisma } from '@prisma/client';
import { formatNumbers } from '@/utils/utils';
import { TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tooltip } from '@radix-ui/react-tooltip';
import { getTaskById } from '@/db/repositories/tasks/getTaskById';
import { FileAttachmentsList } from '../files/FileAttachmentList';
import { useToast } from '@/hooks/use-toast';
import { fileAPI } from '@/utils/fileAPI';
import { useRouter } from 'next/navigation';
import CommentSection from '../comments/CommentSection';
import { handleCommentFragment } from '@/utils/commentNavigation';
import { SerialNumberBadge } from './SerialNumberBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import TaskLinks from './TaskLinks';

interface TaskDetailsViewProps {
  taskId: string;
  task?: Task; // Optional pre-loaded task for SSR
  showBackButton?: boolean;
  onBack?: () => void;
}

export default function TaskDetailsView({
  taskId,
  task: initialTask,
  showBackButton = true,
  onBack,
}: TaskDetailsViewProps) {
  const [taskDetails, setTaskDetails] = useState<Task | null>(initialTask || null);
  const [loading, setLoading] = useState(!initialTask);
  const [files, setFiles] = useState<TaskFile[]>(initialTask?.taskFiles || []);
  const [loadingFileIds, setLoadingFileIds] = useState<string[]>([]);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    async function fetchTaskDetails() {
      if (!taskId || initialTask) return;

      try {
        setLoading(true);
        const { success, task } = await getTaskById(taskId);

        if (success && task) {
          setTaskDetails(task);
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
  }, [taskId, initialTask, toast]);

  const timeForTask = taskDetails?.timeForTask
    ? new Prisma.Decimal(taskDetails?.timeForTask).toString()
    : '';
  const overTime = taskDetails?.overTime ? new Prisma.Decimal(taskDetails.overTime).toString() : '';

  const [, startTransition] = useTransition();
  const handleDownload = async (file: FileSchemaType, options?: { forceDownload?: boolean }) => {
    setLoadingFileIds(prev => [...prev, file.id]);

    startTransition(async () => {
      try {
        const result = await fileAPI.generateDownloadUrl(file.id, {
          forceDownload: options?.forceDownload || false,
          openInNewTab: true,
        });

        if (result.success) {
          toast({
            title: result.data?.openedInNewTab ? 'File Opened' : 'Download Started',
            description: result.data?.openedInNewTab
              ? `"${result.data.fileName}" opened in new tab`
              : `"${result.data.fileName}" download started`,
            variant: 'success',
          });
        } else {
          toast({
            title: 'Download Failed',
            description: result.error || result.message || 'Failed to generate download URL',
            variant: 'destructive',
            icon: <CircleX size={40} />,
          });
        }
      } catch (error) {
        console.error('Error downloading file', error);
        toast({
          title: 'Error',
          description:
            error instanceof Error
              ? error.message
              : 'An error occurred while downloading the file.',
          variant: 'destructive',
          icon: <CircleX size={40} />,
        });
      } finally {
        setLoadingFileIds(prev => prev.filter(id => id !== file.id));
      }
    });
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const refreshTaskData = async () => {
    if (!taskId) return;

    try {
      const { success, task } = await getTaskById(taskId);
      if (success && task) {
        setTaskDetails(task);
        if (task.taskFiles && task.taskFiles.length > 0) {
          setFiles(task.taskFiles);
        } else {
          setFiles([]); // Clear files if none exist
        }
      }
    } catch (error) {
      console.error('Failed to refresh task details:', error);
      toast({
        variant: 'destructive',
        title: 'Error refreshing task details',
        description: 'Failed to reload task information',
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleCommentFragment();
    }, 1000);

    return () => clearTimeout(timer);
  }, [taskId]);
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {showBackButton && (
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <h1 className="text-3xl font-bold">
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="animate-spin h-6 w-6" />
              Loading Task Details...
            </div>
          ) : (
            'Task Details'
          )}
        </h1>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="p-6 space-y-6">
          {/* Header with Serial Number */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <SerialNumberBadge serialNumber={taskDetails?.serialNumber} size="lg" showCopy />
            </div>
          </div>
          <div className="flex">
            <h3 className="font-semibold w-1/4">Task Name</h3>
            <p className="w-3/4">{taskDetails?.title}</p>
          </div>
          <Separator />

          <div className="flex">
            <h3 className="font-semibold w-1/4">Description</h3>
            <p className="w-3/4">{taskDetails?.description}</p>
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
            <p className="w-3/4">
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
                  ))}
              </div>
            </div>
            {taskDetails?.overTime && (
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
            )}
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

          <div className="flex">
            <h3 className="font-semibold w-1/4">Client</h3>
            <p className="w-3/4">
              {(() => {
                const client = taskDetails?.associatedClient || taskDetails?.createdByClient;
                return client ? `${client.contactName} (${client.companyName})` : 'N/A';
              })()}
            </p>
          </div>
          <Separator />
          <div className="flex">
            <h3 className="font-semibold w-1/4">Created By</h3>
            <p className="w-3/4">
              {taskDetails?.createdByClient
                ? `${taskDetails.createdByClient.contactName} (${taskDetails.createdByClient.companyName})`
                : taskDetails?.createdByUser
                  ? `${taskDetails.createdByUser.firstName} ${taskDetails.createdByUser.lastName}`
                  : 'System'}
            </p>
          </div>

          <Separator />
          <div className="flex">
            <h3 className="font-semibold w-1/4">Assigned To</h3>
            <p className="w-3/4">
              {taskDetails?.assignedTo
                ? `${taskDetails.assignedTo.firstName} ${taskDetails.assignedTo.lastName}`
                : 'Unassigned'}
            </p>
          </div>
          {/* Show Task Attachments if any */}
          {files.length > 0 && (
            <>
              <Separator />

              <FileAttachmentsList
                files={files}
                onDownload={handleDownload}
                loadingFileIds={loadingFileIds}
              />
            </>
          )}

          {/* Add Comments Section */}
          <Separator />
          {/* Tabs for Comments and Links */}
          <Tabs defaultValue="comments" className="mt-6">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="links">Links</TabsTrigger>
            </TabsList>

            <TabsContent value="comments" className="mt-0">
              <CommentSection taskId={taskId} onDataChange={refreshTaskData} />
            </TabsContent>

            <TabsContent value="links" className="mt-0">
              <TaskLinks taskId={taskId} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
