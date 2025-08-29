// Enhanced FileTable with error handling and retry logic
'use client';

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
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
import { createFileColumns, FileType } from './file-columns';
import { Button } from '../ui/button';
import { Loader2, UploadCloud, AlertCircle, RefreshCw } from 'lucide-react';
import { useCurrentUser } from '@/utils/authUtils';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { fileAPI } from '@/utils/fileAPI';
import { useFilePreview } from '@/hooks/useFilePreview';
import { FilePreviewModal, PreviewFile } from '../files/FilePreviewModal';

interface FileTableProps {
  fileIds: string[] | null;
  id: string;
  context: 'CLIENT_PROFILE' | 'USER_PROFILE';
  fetchData: (
    id: string,
    cursor: string | null,
    pageSize: number
  ) => Promise<{
    files: FileType[] | undefined;
    success: boolean;
    hasNextCursor: boolean | undefined;
    nextCursor?: string | null;
    totalCount: number | undefined;
  }>;
}

export function FileTable({ fetchData, id, context }: FileTableProps) {
  const [data, setData] = useState<FileType[] | undefined>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number | undefined>(0);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const hasShownErrorToast = useRef(false);

  // Use the enhanced current user hook with retry logic
  const {
    user,
    loading: userLoading,
    error: userError,
    retryCount,
    maxRetries,
    refetch,
  } = useCurrentUser();

  // File preview integration
  const { isPreviewOpen, currentFileIndex, previewFiles, openPreview, closePreview } =
    useFilePreview();

  // Helper function to check if file is previewable
  const isPreviewable = (fileName: string): boolean => {
    const extension = fileName.toLowerCase().split('.').pop() || '';

    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
      return true;
    }
    if (extension === 'pdf') {
      return true;
    }
    // Only include file types that can actually be previewed via iframe
    if (['txt', 'html', 'htm'].includes(extension)) {
      return true;
    }
    return false;
  };

  // Handle file preview with proper navigation logic
  const handlePreviewFile = (fileIndex: number) => {
    if (!data || data.length === 0) return;

    // Get the clicked file
    const clickedFile = data[fileIndex];
    if (!clickedFile) return;

    // Check if the clicked file is previewable
    const isClickedFilePreviewable = isPreviewable(clickedFile.fileName);

    if (!isClickedFilePreviewable) {
      // If file is not previewable, show a toast and don't open preview
      toast({
        title: 'Preview Not Available',
        description: `${clickedFile.fileName} cannot be previewed. Please download to view.`,
        variant: 'default',
      });
      return;
    }

    // Convert FileType[] to PreviewFile[] and filter to previewable only
    const allPreviewFiles: PreviewFile[] = data.map(file => ({
      id: file.id,
      fileName: file.fileName,
      fileSize: file.fileSize,
      uploadedBy: file.uploadedBy,
      dateUploaded: file.dateUploaded,
    }));

    // Filter to only previewable files
    const previewableFiles = allPreviewFiles.filter(file => isPreviewable(file.fileName));

    // Find the correct index in the previewable files array
    const previewableIndex = previewableFiles.findIndex(file => file.id === clickedFile.id);

    if (previewableIndex >= 0) {
      openPreview(previewableFiles, previewableIndex);
    }
  };

  useEffect(() => {
    if (userError && retryCount >= maxRetries && !hasShownErrorToast.current) {
      hasShownErrorToast.current = true;

      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'Unable to load user data. File upload is temporarily disabled.',
        icon: <AlertCircle size={20} />,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('🔄 Toast retry button clicked');
              hasShownErrorToast.current = false; // Reset flag when retrying
              refetch();
              toast({
                title: 'Retrying...',
                description: 'Attempting to reconnect.',
              });
            }}
          >
            <RefreshCw size={16} className="mr-2" />
            Retry
          </Button>
        ),
      });
    }
  }, [userError, retryCount, maxRetries, refetch, toast]); // Added missing dependencies

  // Reset the flag when user is successfully loaded
  useEffect(() => {
    if (user) {
      hasShownErrorToast.current = false;
    }
  }, [user]);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchData(id, cursor, pageSize);
      if (response.success) {
        setData(response.files);
        setTotalCount(response.totalCount);
        setCursor(response.nextCursor ?? null);
      } else {
        console.error('Failed to fetch files');
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
    setLoading(false);
  }, [fetchData, id, cursor, pageSize]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Required',
        description: 'Please ensure you are logged in to upload files.',
        icon: <AlertCircle size={20} />,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              toast({
                title: 'Retrying...',
                description: 'Attempting to reconnect.',
              });
            }}
          >
            <RefreshCw size={16} className="mr-2" />
            Retry
          </Button>
        ),
      });
      return;
    }

    const metadata = {
      fileName: file.name,
      fileSize: `${file.size / 1000}kb`,
      uploadedBy: user.name || user.username,
      createdAt: new Date().toISOString(),
      role: user.role?.name || 'CLIENT',
      userId: user.id,
      ...(context === 'CLIENT_PROFILE' && { targetClientId: id }),
      ...(context === 'USER_PROFILE' && { targetUserId: id }),
      uploadContext: context,
    };

    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    startTransition(async () => {
      try {
        const response = await fileAPI.uploadFile(formData);
        if (response.success) {
          fetchFiles();
          toast({
            title: 'Upload Successful',
            description: `${file.name} has been uploaded successfully.`,
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Upload Failed',
            description: response.error || response.message || 'Failed to upload file.',
            icon: <AlertCircle size={20} />,
          });
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        toast({
          variant: 'destructive',
          title: 'Upload Error',
          description: 'An error occurred while uploading the file.',
          icon: <AlertCircle size={20} />,
        });
      }
    });

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  // Create columns with preview handler
  const columns = createFileColumns(handlePreviewFile);

  const table = useReactTable({
    data: data ? data : [],
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

  // Show upload disabled alert when user failed to load
  const showUploadDisabledAlert = userError && retryCount >= maxRetries;

  return (
    <>
      <div className="space-y-2 rounded-md border">
        <div className="p-4 flex justify-between">
          <h2 className="text-lg">Files Uploaded</h2>
          <div className="flex items-center gap-3">
            <Button variant="outline">Download All</Button>

            {/* Show upload button only when user is available */}
            {user && !userLoading && !showUploadDisabledAlert ? (
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
                {isPending ? 'Uploading...' : 'Upload'}
              </Button>
            ) : userLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : null}

            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          </div>
        </div>

        {/* Show alert when upload is disabled due to user auth issues */}
        {showUploadDisabledAlert && (
          <div className="px-4 pb-2">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>File upload is temporarily disabled due to authentication issues.</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    refetch();
                    toast({
                      title: 'Retrying...',
                      description: 'Attempting to reconnect.',
                    });
                  }}
                  className="ml-2"
                >
                  <RefreshCw size={16} className="mr-2" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <Table className="p-4">
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
                <TableCell colSpan={columns.length} className="text-center">
                  <Skeleton className="h-64 w-full" />
                </TableCell>
              </TableRow>
            ) : data && data.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center">
                  No files found.
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
          clientIds={[]}
        />
      </div>

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={isPreviewOpen}
        onClose={closePreview}
        files={previewFiles}
        initialIndex={currentFileIndex}
      />
    </>
  );
}
