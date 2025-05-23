'use client';

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/Pagination';
import { generateUserTaskColumns } from './user-task-columns';
import { useSelectedTask } from '@/store/useTaskStore';
import EditTaskDialog from '../common/EditTaskDialog';
import TaskDetailsModal from '../tasks/TaskDetailsDialog';
import { Roles } from '@prisma/client';
import { TaskTable } from '@/utils/validationSchemas';
import { deleteTaskById } from '@/db/repositories/tasks/deleteTaskById';
import { useToast } from '@/hooks/use-toast';
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
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { CustomTooltip } from '../CustomTooltip';

interface UserTasksTableProps {
  data: TaskTable[];
  loading: boolean;
  totalCount?: number;
  pageSize: number;
  cursor: string | null;
  setCursor: (cursor: string | null) => void;
  pageIndex: number;
  setPageIndex: (index: number) => void;
  showDescription?: boolean;
  setPageSize: (pageSize: number) => void;
  taskIds: string[] | null;
  role: Roles;
  fetchTasks?: () => Promise<void>; // Optional callback to refresh tasks
}

export function UserTasksTable({
  data,
  loading,
  totalCount,
  pageSize,
  cursor,
  setCursor,
  pageIndex,
  setPageIndex,
  showDescription = false,
  setPageSize,
  taskIds,
  role,
  fetchTasks,
}: UserTasksTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const { setSelectedTask, selectedTask } = useSelectedTask();
  const { toast } = useToast();

  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskTable | null>(null);

  // For delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [localData, setLocalData] = useState<TaskTable[]>(data);

  // Update local data when prop data changes
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const handleDeleteTask = async (taskId: string) => {
    setTaskToDelete(taskId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;

    setIsDeletingTask(true);
    try {
      const response = await deleteTaskById(taskToDelete);

      if (response.success) {
        // Optimistically update local data
        setLocalData(prev => prev.filter(task => task.id !== taskToDelete));

        toast({
          title: 'Task deleted',
          description: 'The task has been successfully deleted',
          variant: 'success',
          icon: <CheckCircle className="h-4 w-4" />,
        });

        // Refresh data from server if callback provided
        if (fetchTasks) {
          await fetchTasks();
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
      setTaskToDelete(null);
    }
  };

  const userTaskColumns = generateUserTaskColumns(
    showDescription,
    task => {
      setTaskToEdit(task);
      setIsEditDialogOpen(true);
    },
    handleDeleteTask
  );

  const table = useReactTable({
    data: localData,
    columns: userTaskColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
    },
  });

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={userTaskColumns.length} className="text-center">
                  <Skeleton className="h-64 w-full" />
                </TableCell>
              </TableRow>
            ) : localData && localData.length ? (
              table.getRowModel().rows.map(row => (
                <CustomTooltip
                  key={row.id}
                  content={
                    <span className="font-semibold">Show details for {row.original.title}</span>
                  }
                  variant="primary"
                  delayDuration={100}
                >
                  <TableRow
                    onClick={() => {
                      setSelectedTask(row.original);
                      setOpenDetailsDialog(true);
                    }}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                </CustomTooltip>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={userTaskColumns.length} className="text-center">
                  No tasks found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-row justify-between items-center my-2">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        {/* Pagination */}
        <Pagination
          loading={loading}
          pageSize={pageSize}
          setPageSize={setPageSize}
          cursor={cursor}
          setCursor={setCursor}
          pageIndex={pageIndex}
          setPageIndex={setPageIndex}
          totalPages={totalPages}
          clientIds={taskIds ?? []}
        />
      </div>

      {/* Modals and Dialogs */}
      <TaskDetailsModal
        taskId={selectedTask?.id ?? ''}
        open={openDetailsDialog}
        setOpen={setOpenDetailsDialog}
      />

      {taskToEdit && (
        <EditTaskDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          task={taskToEdit}
          role={role}
        />
      )}

      {/* Delete Confirmation Dialog */}
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
    </div>
  );
}
