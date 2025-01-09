"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/Pagination";
import { useRouter } from "next/navigation";
import { useClientStore } from "@/store/useClientStore";
import { Client, columns } from "./columns";
interface DataTableProps {
  fetchData: (
    cursor: string | null,
    pageSize: number,
  ) => Promise<{
    clients: Client[] | undefined;
    nextCursor?: string | null;
    totalCount?: number;
  }>;
  clientIds: string[];
}

export function DataTable({ fetchData, clientIds }: DataTableProps) {
  const [data, setData] = useState<Client[] | undefined>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number | undefined>(0);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const { setSelectedClient } = useClientStore();
  const router = useRouter();
  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await fetchData(cursor, pageSize);
      setData(response.clients);
      setTotalCount(response.totalCount);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, [cursor, pageSize]);

  // Calculate total number of pages
  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  const table = useReactTable({
    data: data ? data : [],
    columns: columns,
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
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
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
            ) : data && data.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => {
                    setSelectedClient({
                      id: row.original.id ?? "",
                      username: row.original.contactName ?? "",
                    });
                    router.push(`/clients/${row.original.id}`);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
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
      {/* Integrate Pagination */}
      <div className="flex flex-row my-2">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
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
          clientIds={clientIds}
        />
      </div>
    </>
  );
}
