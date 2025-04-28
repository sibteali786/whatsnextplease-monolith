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
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { deleteEntity } from '@/utils/entityActions';

// Define the user schema using Zod
export const UserSchema = z.object({
  id: z.string(),
  role: z.string().nullable(),
  firstName: z.string(),
  lastName: z.string(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().email(),
});

// Type generated from Zod schema
export type User = z.infer<typeof UserSchema>;

// Delete user confirmation dialog component
const DeleteUserDialog = ({
  isOpen,
  setIsOpen,
  userName,
  onDelete,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  userName: string;
  onDelete: () => Promise<void>;
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      toast({
        title: 'User deleted',
        description: `${userName} has been successfully removed.`,
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete user. Please try again.',
        variant: 'destructive',
      });
      console.error('Failed to delete user:', error);
    } finally {
      setIsDeleting(false);
      setIsOpen(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete User</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <span className="font-semibold">{userName}</span>? This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isDeleting}
            onClick={e => {
              e.stopPropagation();
            }}
          >
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

// Separate React component for the cell actions
const UserActionCell = ({
  user,
  refreshData,
}: {
  user: User;
  refreshData: () => Promise<void>;
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const userName = `${user.firstName} ${user.lastName}`;

  const handleDeleteUser = async () => {
    await deleteEntity('user', user.id);
    await refreshData(); // Refresh data after deletion
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
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={e => {
              e.stopPropagation();
              navigator.clipboard.writeText(user.id);
            }}
          >
            Copy User ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={e => {
              e.stopPropagation();
              console.log(`Edit User: ${user.id}`);
              // TODO: Implement edit functionality
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit User
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={e => {
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteUserDialog
        isOpen={showDeleteDialog}
        setIsOpen={setShowDeleteDialog}
        userName={userName}
        onDelete={handleDeleteUser}
      />
    </>
  );
};

// Factory function to create columns with delete functionality
export const createColumns = (refreshData: () => Promise<void>): ColumnDef<User>[] => {
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
      accessorKey: 'role',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Roles
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'firstName',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          First Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'lastName',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Last Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'address',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Address
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'city',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          City
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'state',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          State
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'phone',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Phone
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
      id: 'actions',
      cell: ({ row }) => {
        // Instead of using useState directly in the cell function,
        // we render a proper React component that can use hooks
        return <UserActionCell user={row.original} refreshData={refreshData} />;
      },
    },
  ];
};

// Export default columns (for backward compatibility)
export const columns: ColumnDef<User>[] = createColumns(async () => {});
