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
import { billingColumns, BillingType } from "./billing-colums";
import { useParams } from "next/navigation";
import { GetInvoicesByClientIdResponse } from "@/utils/validationSchemas";

interface BillingTableProps {
  billingIds: string[] | null;
  fetchData: (
    clientId: string,
    cursor: string | null,
    pageSize: number,
  ) => Promise<GetInvoicesByClientIdResponse>;
}

export function BillingTable({ fetchData, billingIds }: BillingTableProps) {
  const [data, setData] = useState<BillingType[] | undefined>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number | undefined>(0);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const { clientId }: { clientId: string } = useParams();

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await fetchData(clientId, cursor, pageSize);
      if (response.success) {
        setData(response.invoices);
        setTotalCount(response.totalCount);
        setCursor(response.nextCursor ?? null);
      } else {
        console.error(response.message);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, [cursor, pageSize]);

  // Calculate total number of pages
  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  const table = useReactTable({
    data: data ? data : [],
    columns: billingColumns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      pagination: {
        pageIndex,
        pageSize,
      },
      sorting,
      rowSelection,
    },
    manualPagination: true,
    pageCount: totalPages,
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
              <TableRow>
                <TableCell
                  colSpan={billingColumns.length}
                  className="text-center"
                >
                  <Skeleton className="h-64 w-full" />
                </TableCell>
              </TableRow>
            ) : data && data.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
                <TableCell
                  colSpan={billingColumns.length}
                  className="text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
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
          clientIds={billingIds ?? []}
        />
      </div>
    </>
  );
}
