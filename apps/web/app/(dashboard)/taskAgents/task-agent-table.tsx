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
import { createTaskAgentColumns } from './task-agent-columns';
import { TaskAgent } from '@/utils/taskAgentApi';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';

interface TaskAgentTableProps {
  fetchData: (
    cursor: string | null,
    pageSize: number
  ) => Promise<{
    taskAgents: TaskAgent[];
    nextCursor?: string | null;
    totalCount: number;
  }>;
  agentIds: string[];
  status: string;
  searchTerm: string;
}

export function TaskAgentTable({ fetchData, agentIds, status, searchTerm }: TaskAgentTableProps) {
  const [data, setData] = useState<TaskAgent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const router = useRouter();
  const { setSelectedUser } = useUserStore();
  const fetchAgents = async () => {
    setLoading(true);
    try {
      const cursorToUse = pageIndex > 0 ? cursor : null;
      const response = await fetchData(cursorToUse, pageSize);
      setData(response.taskAgents);
      setTotalCount(response.totalCount);
      if (response.nextCursor) setCursor(response.nextCursor);
    } catch (error) {
      console.error('Failed to fetch task agents:', error);
    }
    setLoading(false);
  };
  // Create handler function
  const handleUserClick = (user: { id: string; name: string }) => {
    setSelectedUser(user);
    router.push(`/users/${user.id}`);
  };
  const taskAgentColumns = createTaskAgentColumns(handleUserClick);
  useEffect(() => {
    fetchAgents();
  }, [pageIndex, pageSize, status, searchTerm]);

  // Calculate total number of pages
  const totalPages = Math.ceil(totalCount / pageSize);

  const table = useReactTable({
    data,
    columns: taskAgentColumns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    manualPagination: true,
    pageCount: totalPages,
    state: {
      pagination: {
        pageIndex,
        pageSize,
      },
      sorting,
      rowSelection,
    },
  });

  return (
    <>
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
                <TableCell colSpan={taskAgentColumns.length} className="text-center">
                  <Skeleton className="h-64 w-full" />
                </TableCell>
              </TableRow>
            ) : data.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={taskAgentColumns.length} className="text-center">
                  No task agents found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-row my-2">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <Pagination
          cursor={cursor}
          setCursor={setCursor}
          loading={loading}
          pageIndex={pageIndex}
          setPageIndex={setPageIndex}
          pageSize={pageSize}
          setPageSize={setPageSize}
          totalPages={totalPages}
          clientIds={agentIds}
        />
      </div>
    </>
  );
}
