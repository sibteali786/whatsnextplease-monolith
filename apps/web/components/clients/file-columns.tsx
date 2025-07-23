'use client';

import { Button } from '@/components/ui/button';
import { ColumnDef, Row } from '@tanstack/react-table';
import { ArrowUpDown, CircleCheckBig, FileIcon, MoreHorizontal } from 'lucide-react';
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
export type FileType = {
  id: string;
  fileName: string;
  fileSize: string;
  dateUploaded: Date;
  lastUpdated: Date;
  uploadedBy: string;
};
import { useToast } from '@/hooks/use-toast';
import { fileAPI } from '@/utils/fileAPI';

// Define columns for the Files table
export const fileColumns: ColumnDef<FileType>[] = [
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
    cell: ({ row }) => {
      const fileName: string = row.getValue('fileName');
      return (
        <div className="gap-1 flex flex-row items-center">
          <Button
            className="rounded-full bg-primary-foreground dark:bg-primary-foreground"
            variant="outline"
            size="icon"
          >
            <FileIcon className="text-primary h-6 w-6" />
          </Button>
          {fileName}
        </div>
      );
    },
  },
  {
    accessorKey: 'fileSize',
    header: 'File size',
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
    cell: ({ row }) => <CellAction row={row} />,
  },
];
interface CellActionProps {
  row: Row<FileType>;
}
export const CellAction: React.FC<CellActionProps> = ({ row }) => {
  const file = row.original; // Now we have access to the `original` file data
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
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
        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(file.id)}>
          Copy File ID
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDeleteFile} disabled={isPending}>
          {isPending ? 'Deleting...' : 'Delete File'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
