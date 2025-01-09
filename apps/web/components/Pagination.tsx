"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTablePaginationProps {
  cursor: string | null;
  setCursor: (cursor: string | null) => void;
  loading: boolean;
  pageIndex: number;
  setPageIndex: (index: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  totalPages: number;
  clientIds: string[];
}

export function Pagination({
  setCursor,
  loading,
  pageIndex,
  setPageIndex,
  pageSize,
  setPageSize,
  totalPages,
  clientIds,
  cursor,
}: DataTablePaginationProps) {
  // Generate page numbers
  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    const clientIndex = (page - 1) * pageSize;
    const newCursor = clientIds[clientIndex - 1] || null;
    setPageIndex(page - 1);
    console.log({ newCursor, clientIndex, page }, "Testing");
    if (cursor !== newCursor) {
      setCursor(newCursor);
    }
  };

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => setPageSize(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(1)} // Reset to first page
          disabled={pageIndex === 0 || loading}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(pageIndex)} // Go to previous page
          disabled={pageIndex === 0 || loading}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        {getPageNumbers().map((page) => (
          <Button
            key={page}
            variant={pageIndex === page - 1 ? "default" : "link"}
            size="sm"
            onClick={() => handlePageChange(page)}
            disabled={loading}
          >
            {page}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(pageIndex + 2)} // Go to next page
          disabled={pageIndex >= totalPages - 1 || loading}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(totalPages)} // Go to last page
          disabled={pageIndex >= totalPages - 1 || loading}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
