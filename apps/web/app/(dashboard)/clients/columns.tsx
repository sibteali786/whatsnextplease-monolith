'use client';
'use client';

import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import { z } from 'zod';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState, useEffect, MutableRefObject } from 'react';
import { useToast } from '@/hooks/use-toast';
import { deleteEntity } from '@/utils/entityActions';
import { EditClientModal } from '@/components/clients/EditClientModal';

// ------------------------------
// Schema Definition
// ------------------------------
export const ClientSchema = z.object({
  id: z.string(),
  username: z.string().nullable(),

  companyName: z.string(),
  contactName: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),

  address1: z.string().nullable(),
  address2: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zipCode: z.string().nullable(),
});

export type Client = z.infer<typeof ClientSchema>;

// ------------------------------
// Delete Client Dialog
// ------------------------------
const DeleteClientDialog = ({
  isOpen,
  setIsOpen,
  clientName,
  onDelete,
  modalStateRef,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  clientName: string;
  onDelete: () => Promise<void>;
  modalStateRef: MutableRefObject<boolean>;
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    modalStateRef.current = isOpen;
  }, [isOpen, modalStateRef]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      toast({
        title: 'Client deleted',
        description: `${clientName} has been successfully removed.`,
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete client. Please try again.',
        variant: 'destructive',
      });
      console.error('Failed to delete client:', error);
    } finally {
      setIsDeleting(false);
      setIsOpen(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent onClick={e => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Client</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <span className="font-semibold">{clientName}</span>?
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} onClick={e => e.stopPropagation()}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              handleDelete();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// ------------------------------
// Client Action Cell
// ------------------------------
const ClientActionCell = ({
  client,
  refreshData,
  modalStateRef,
}: {
  client: Client;
  refreshData: () => Promise<void>;
  modalStateRef: MutableRefObject<boolean>;
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const clientName = client.companyName;

  useEffect(() => {
    modalStateRef.current = showDeleteDialog || showEditModal;
  }, [showDeleteDialog, showEditModal, modalStateRef]);

  const handleDeleteClient = async () => {
    await deleteEntity('client', client.id);
    await refreshData();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" onClick={e => e.stopPropagation()}>
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={e => {
              e.stopPropagation();
              navigator.clipboard.writeText(client.id);
            }}
          >
            Copy Client ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={e => {
              e.stopPropagation();
              modalStateRef.current = true; // Use the passed ref
              setShowEditModal(true);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Client
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={e => {
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Client
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditClientModal
        client={client}
        isOpen={showEditModal}
        onClose={() => {
          modalStateRef.current = false; // reset ref on close
          setShowEditModal(false);
        }}
        onSuccess={refreshData}
        modalStateRef={modalStateRef}
      />
      <DeleteClientDialog
        isOpen={showDeleteDialog}
        setIsOpen={open => {
          modalStateRef.current = open; // sync ref
          setShowDeleteDialog(open);
        }}
        clientName={clientName}
        onDelete={handleDeleteClient}
        modalStateRef={modalStateRef}
      />
    </>
  );
};

// ------------------------------
// Column Factory
// ------------------------------
export const createColumns = (
  refreshData: () => Promise<void>,
  modalStateRef: MutableRefObject<boolean>
): ColumnDef<Client>[] => {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
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
          onClick={e => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'companyName',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Company Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'contactName',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Contact Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <a
          href={`mailto:${row.getValue('email')}`}
          className="hover:text-blue-500"
          onClick={e => e.stopPropagation()}
        >
          {row.getValue('email')}
        </a>
      ),
    },
    {
      accessorKey: 'phone',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Phone
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'website',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Website
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const website = row.getValue('website') as string | null;
        if (!website) return null;

        return (
          <a
            href={`https://${website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-500"
            onClick={e => e.stopPropagation()}
          >
            {String(website)}
          </a>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <ClientActionCell
          client={row.original}
          refreshData={refreshData}
          modalStateRef={modalStateRef}
        />
      ),
    },
  ];
};

// Default export for compatibility
export const columns: ColumnDef<Client>[] = createColumns(async () => {}, {
  current: false,
} as MutableRefObject<boolean>);
