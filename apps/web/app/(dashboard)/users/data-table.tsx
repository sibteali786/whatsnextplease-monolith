'use client';

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useEffect, useState, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Search from '@/components/Search';
import { PlusCircle } from 'lucide-react';
import { LinkButton } from '@/components/ui/LinkButton';

import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/Pagination';
import { useRouter } from 'next/navigation';
import { User, createColumns } from './columns';
import { useUserStore } from '@/store/useUserStore';
import { CustomTooltip } from '@/components/CustomTooltip';

interface DataTableProps {
  fetchData: (
    cursor: string | null,
    pageSize: number,
    search: string
  ) => Promise<{
    users: User[];
    nextCursor?: string;
    totalCount: number;
  }>;
  userIds: string[];
}

export function DataTable({ fetchData, userIds }: DataTableProps) {
  const [data, setData] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const router = useRouter();
  const { setSelectedUser } = useUserStore();

  // Track if a modal/dialog is currently open
  const isModalOpenRef = useRef(false);

  // Track the last click time to prevent rapid clicks
  const lastClickTimeRef = useRef(0);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await fetchData(cursor, pageSize, debouncedSearch);
      setData(response.users);
      setTotalCount(response.totalCount);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [cursor, pageSize, debouncedSearch]);

  // Create columns with refresh data callback and modal state ref
  const columns = createColumns(fetchItems, isModalOpenRef);

  const totalPages = Math.ceil(totalCount / pageSize);

  const table = useReactTable({
    data,
    columns,
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

  const handleRowClick = (user: User) => {
    // Prevent navigation if:
    // 1. A modal is open
    // 2. Click happened too recently (debounce)
    const now = Date.now();
    if (isModalOpenRef.current || now - lastClickTimeRef.current < 300) {
      return;
    }

    lastClickTimeRef.current = now;

    setSelectedUser({
      id: user.id ?? '',
      name: `${user.firstName} ${user.lastName}`,
    });
    router.push(`/users/${user.id}`);
  };
  useEffect(() => {
    const delay = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 700); // debounce delay (ms)

    return () => clearTimeout(delay);
  }, [search]);
  return (
    <>
      <div className="flex flex-row justify-between items-center">
        <Search placeholder="Search here" onSearch={value => setSearch(value)} />
        <LinkButton className="gap-2" href="users/adduser" prefetch={true}>
          <PlusCircle />
          Add User
        </LinkButton>
      </div>
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
              <TableRow className="w-full">
                <TableCell colSpan={columns.length} className="text-center">
                  <Skeleton className="h-64 w-full" />
                </TableCell>
              </TableRow>
            ) : data.length ? (
              table.getRowModel().rows.map(row => (
                <CustomTooltip
                  key={row.id}
                  content={
                    <span className="font-semibold">
                      Show details for {row.original.firstName + ' ' + row.original.lastName}
                    </span>
                  }
                  variant="primary"
                  delayDuration={100}
                >
                  <TableRow
                    key={row.id}
                    onClick={() => handleRowClick(row.original)}
                    className="cursor-pointer"
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
                <TableCell colSpan={columns.length} className="text-center">
                  No results.
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
          clientIds={userIds}
        />
      </div>
    </>
  );
}
