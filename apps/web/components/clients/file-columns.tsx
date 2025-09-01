/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Button } from '@/components/ui/button';
import { ColumnDef, Row } from '@tanstack/react-table';
import { ArrowUpDown, CircleCheckBig, FileIcon, MoreHorizontal, Eye } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { fileAPI } from '@/utils/fileAPI';
import { formatFileSize, isPreviewable } from '@/utils/files/utils';

export type FileType = {
  id: string;
  fileName: string;
  fileSize: string;
  dateUploaded: Date;
  lastUpdated: Date;
  uploadedBy: string;
};

// Define columns for the Files table
export const createFileColumns = (
  onPreviewFile?: (fileIndex: number) => void
): ColumnDef<FileType>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={value => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'fileName',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        File name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row, table }) => {
      const fileName: string = row.getValue('fileName');
      const filePreviewable = isPreviewable(fileName);

      // Get row index for preview
      const rowIndex = table.getRowModel().rows.findIndex(r => r.id === row.id);

      return (
        <div className="gap-2 flex flex-row items-center">
          <Button
            className="rounded-full bg-primary-foreground dark:bg-primary-foreground"
            variant="outline"
            size="icon"
          >
            <FileIcon className="text-primary h-6 w-6" />
          </Button>

          {filePreviewable && onPreviewFile ? (
            <button
              onClick={() => onPreviewFile(rowIndex)}
              className="text-left hover:text-primary hover:underline transition-colors cursor-pointer"
              title={`Preview ${fileName}`}
            >
              {fileName}
            </button>
          ) : (
            <span>{fileName}</span>
          )}

          {filePreviewable && <Eye className="h-4 w-4 text-muted-foreground" />}
        </div>
      );
    },
  },
  {
    accessorKey: 'fileSize',
    header: 'File size',
    cell: ({ row }) => {
      const fileSize: string = row.getValue('fileSize');

      return formatFileSize(fileSize);
    },
  },
  {
    accessorKey: 'dateUploaded',
    header: 'Date uploaded',
    cell: ({ row }) => {
      const date: Date = row.getValue('dateUploaded');
      return date ? new Date(date).toLocaleDateString() : 'N/A';
    },
  },
  {
    accessorKey: 'lastUpdated',
    header: 'Last updated',
    cell: ({ row }) => {
      const date: Date = row.getValue('lastUpdated');
      return date ? new Date(date).toLocaleDateString() : 'N/A';
    },
  },
  {
    accessorKey: 'uploadedBy',
    header: 'Uploaded by',
  },
  {
    id: 'actions',
    cell: ({ row, table }) => <CellAction row={row} onPreviewFile={onPreviewFile} table={table} />,
  },
];

interface CellActionProps {
  row: Row<FileType>;
  onPreviewFile?: (fileIndex: number) => void;
  table?: any; // Table instance
}

export const CellAction: React.FC<CellActionProps> = ({ row, onPreviewFile, table }) => {
  const file = row.original;
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const filePreviewable = isPreviewable(file.fileName);
  const rowIndex = table ? table.getRowModel().rows.findIndex((r: any) => r.id === row.id) : -1;

  const handleDeleteFile = () => {
    startTransition(async () => {
      try {
        const result = await fileAPI.deleteFile(file.id);
        if (result.success) {
          toast({
            title: 'File deleted successfully!',
            description: `The file ${file.fileName} is deleted`,
            variant: 'success',
            icon: <CircleCheckBig size={40} />,
          });
        } else {
          toast({
            title: 'Failed to delete file',
            description: result.error || result.message || 'Unknown error',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error deleting file:', error);
        toast({
          title: 'Failed to delete file',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      }
    });
  };

  const handlePreviewFile = () => {
    console.log('Preview file clicked', filePreviewable, rowIndex);
    if (filePreviewable && onPreviewFile && rowIndex >= 0) {
      onPreviewFile(rowIndex);
    }
  };

  const handleDownloadFile = async () => {
    try {
      const result = await fileAPI.generateDownloadUrl(file.id, {
        forceDownload: true,
      });

      if (result.success && result.data?.downloadUrl) {
        const link = document.createElement('a');
        link.href = result.data.downloadUrl;
        link.setAttribute('download', file.fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: 'Download Started',
          description: `Downloading ${file.fileName}`,
        });
      } else {
        throw new Error(result.error || 'Failed to generate download URL');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Failed to download file',
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>

        {filePreviewable && onPreviewFile && (
          <>
            <DropdownMenuItem onClick={handlePreviewFile}>
              <Eye className="mr-2 h-4 w-4" />
              Preview File
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem onClick={handleDownloadFile}>Download File</DropdownMenuItem>

        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(file.id)}>
          Copy File ID
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleDeleteFile}
          disabled={isPending}
          className="text-destructive"
        >
          {isPending ? 'Deleting...' : 'Delete File'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Export the default columns for backward compatibility
export const fileColumns = createFileColumns();
