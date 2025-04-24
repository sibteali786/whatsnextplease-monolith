'use client';

import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';

// Update interface to match actual API response
export interface TaskAgent {
  id: string;
  firstName: string;
  lastName: string;
  designation: string | null;
  assignedTasksCount: number;
  inProgressTasksCount: number;
  completedTasksCount: number;
  overdueTasksCount: number;
}

export const taskAgentColumns: ColumnDef<TaskAgent>[] = [
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
    id: 'name',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Agent Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    accessorFn: row => `${row.firstName} ${row.lastName}`,
  },
  {
    accessorKey: 'designation',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Roles
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const designation = row.getValue('designation') as string | null;
      return designation || 'Task Agent';
    },
  },
  {
    accessorKey: 'assignedTasksCount',
    header: 'Assigned Tasks',
    cell: ({ row }) => {
      const value = row.getValue('assignedTasksCount') as number;
      return (
        <div className="text-center">{value === 0 ? '0' : value < 10 ? `0${value}` : value}</div>
      );
    },
  },
  {
    accessorKey: 'inProgressTasksCount',
    header: 'In Progress Tasks',
    cell: ({ row }) => {
      const value = row.getValue('inProgressTasksCount') as number;
      return (
        <div className="text-center">{value === 0 ? '0' : value < 10 ? `0${value}` : value}</div>
      );
    },
  },
  {
    accessorKey: 'completedTasksCount',
    header: 'Completed Tasks',
    cell: ({ row }) => {
      const value = row.getValue('completedTasksCount') as number;
      return (
        <div className="text-center">{value === 0 ? '0' : value < 10 ? `0${value}` : value}</div>
      );
    },
  },
  {
    accessorKey: 'overdueTasksCount',
    header: 'Overdue Tasks',
    cell: ({ row }) => {
      const value = row.getValue('overdueTasksCount') as number;
      return (
        <div className="text-center">{value === 0 ? '0' : value < 10 ? `0${value}` : value}</div>
      );
    },
  },
  {
    id: 'details',
    header: 'Details',
    cell: ({ row }) => {
      const agentId = row.original.id;
      return (
        <Link
          href={`/users/${agentId}`}
          className="text-purple-600 hover:text-purple-800 hover:underline"
        >
          View Details
        </Link>
      );
    },
  },
];
