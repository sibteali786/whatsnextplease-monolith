"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useEffect, useRef, useState, useTransition } from "react";
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
import { fileColumns, FileType } from "./file-columns";
import { useParams } from "next/navigation";
import { Button } from "../ui/button";
import { Loader2, UploadCloud } from "lucide-react";
import { handleFileUpload } from "@/utils/fileHandler";

interface FileTableProps {
  fileIds: string[] | null;
  id: string;
  fetchData: (
    id: string,
    cursor: string | null,
    pageSize: number,
  ) => Promise<{
    files: FileType[] | undefined;
    success: boolean;
    hasNextCursor: boolean | undefined;
    nextCursor?: string | null;
    totalCount: number | undefined;
  }>;
}

export function FileTable({ fetchData, id }: FileTableProps) {
  const [data, setData] = useState<FileType[] | undefined>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number | undefined>(0);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const { clientId }: { clientId: string } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Transition for showing the loading state
  const [isPending, startTransition] = useTransition();

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await fetchData(id, cursor, pageSize);
      if (response.success) {
        setData(response.files);
        setTotalCount(response.totalCount);
        setCursor(response.nextCursor ?? null);
      } else {
        console.error("Failed to fetch files");
      }
    } catch (error) {
      console.error("Error fetching files:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFiles();
  }, [cursor, pageSize]);

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      startTransition(async () => {
        try {
          const response = await handleFileUpload(formData, clientId);
          if (response.success) {
            fetchFiles();
          }
          console.log("File uploaded successfully", response.file);
        } catch (error) {
          console.error("Error uploading file:", error);
        }
      });
    }
  };

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  const table = useReactTable({
    data: data ? data : [],
    columns: fileColumns,
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
      <div className="space-y-2 rounded-md border">
        <div className="p-4 flex justify-between">
          <h2 className="text-lg">Files Uploaded</h2>
          <div className="flex items-center gap-3">
            <Button variant="outline">Download All</Button>
            <Button
              variant="default"
              className="gap-2"
              onClick={handleUploadClick}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <UploadCloud size={20} />
              )}
              {isPending ? "Uploading..." : "Upload"}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
        <Table className="p-4">
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
                <TableCell colSpan={fileColumns.length} className="text-center">
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
                <TableCell colSpan={fileColumns.length} className="text-center">
                  No files found.
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
          clientIds={[]}
        />
      </div>
    </>
  );
}
