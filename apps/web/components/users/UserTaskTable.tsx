'use client';

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
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
}: UserTasksTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const { setSelectedTask, selectedTask } = useSelectedTask();

  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskTable | null>(null);

  const userTaskColumns = generateUserTaskColumns(showDescription, task => {
    setTaskToEdit(task);
    setIsEditDialogOpen(true);
  });

  const table = useReactTable({
    data,
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
            ) : data && data.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  onClick={() => {
                    setSelectedTask(row.original);
                    setOpenDetailsDialog(true);
                  }}
                  className="cursor-pointer"
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
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
      {/* Task Details and Edit Dialog */}
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
    </div>
  );
}
