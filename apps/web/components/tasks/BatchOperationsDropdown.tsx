/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Users, Tag, Flag, Calendar, Trash2, Download, Copy, X } from 'lucide-react';
import { Roles } from '@prisma/client';
import { BatchUpdateDialog, UserDropdownMenuContent } from './BatchUpdateDialog';
import { BatchDeleteDialog } from './BatchDeleteDialog';
import { TaskTable } from '@/utils/validationSchemas';

interface BatchOperationsDropdownProps {
  selectedTasks: TaskTable[];
  onBatchUpdate: (updates: any) => Promise<void>;
  onBatchDelete: (taskIds: string[]) => Promise<void>;
  onClearSelection: () => void;
  role: Roles;
  taskCategories: { id: string; categoryName: string }[];
  users: UserDropdownMenuContent[];
  isLoading?: boolean;
}

export function BatchOperationsDropdown({
  selectedTasks,
  onBatchUpdate,
  onBatchDelete,
  onClearSelection,
  role,
  taskCategories,
  users,
  isLoading = false,
}: BatchOperationsDropdownProps) {
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [updateType, setUpdateType] = useState<
    'status' | 'priority' | 'assignee' | 'category' | 'dueDate'
  >('status');

  const selectedCount = selectedTasks.length;

  const handleBatchOperation = (type: typeof updateType) => {
    setUpdateType(type);
    setUpdateDialogOpen(true);
  };

  const handleExport = () => {
    // Convert selected tasks to CSV
    const headers = [
      'ID',
      'Title',
      'Status',
      'Priority',
      'Assignee',
      'Due Date',
      'Category',
      'Skills',
    ];
    const rows = selectedTasks.map(task => [
      task.id,
      `"${task.title.replace(/"/g, '""')}"`, // Escape quotes in title
      task.status?.statusName || 'N/A',
      task.priority?.priorityName || 'N/A',
      task.assignedTo ? `"${task.assignedTo.firstName} ${task.assignedTo.lastName}"` : 'Unassigned',
      task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date',
      task.taskCategory?.categoryName || 'N/A',
      task.taskSkills ? `"${task.taskSkills.join(', ')}"` : 'None',
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const canModifyTasks = [
    Roles.SUPER_USER,
    Roles.TASK_SUPERVISOR,
    Roles.DISTRICT_MANAGER,
    Roles.TERRITORY_MANAGER,
  ].includes(role as any);

  if (selectedCount === 0) {
    return null;
  }

  const getAssignmentMenuText = () => {
    const assigned = selectedTasks.filter(task => task.assignedTo);
    const unassigned = selectedTasks.filter(task => !task.assignedTo);

    if (unassigned.length === selectedTasks.length) return 'Assign Tasks';
    if (assigned.length === selectedTasks.length) {
      const uniqueAssignees = new Set(assigned.map(task => task.assignedTo?.id));
      return uniqueAssignees.size === 1 ? 'Change Assignment' : 'Reassign Tasks';
    }
    return 'Manage Assignment';
  };
  return (
    <>
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
        <Badge variant="secondary" className="text-sm font-medium">
          {selectedCount} task{selectedCount > 1 ? 's' : ''} selected
        </Badge>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isLoading}>
                Batch Actions
                <MoreVertical className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {canModifyTasks && (
                <>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Tag className="mr-2 h-4 w-4" />
                      Update Status
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => handleBatchOperation('status')}>
                        <Tag className="mr-2 h-4 w-4" />
                        Change Status
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Flag className="mr-2 h-4 w-4" />
                      Update Priority
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => handleBatchOperation('priority')}>
                        <Flag className="mr-2 h-4 w-4" />
                        Change Priority
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Users className="mr-2 h-4 w-4" />
                      {getAssignmentMenuText()}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => handleBatchOperation('assignee')}>
                        <Users className="mr-2 h-4 w-4" />
                        {getAssignmentMenuText()}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Copy className="mr-2 h-4 w-4" />
                      Update Category
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => handleBatchOperation('category')}>
                        <Copy className="mr-2 h-4 w-4" />
                        Change Category
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuItem onClick={() => handleBatchOperation('dueDate')}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Update Due Date
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuItem onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export Selected
              </DropdownMenuItem>

              {canModifyTasks && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <BatchUpdateDialog
        open={updateDialogOpen}
        onOpenChange={setUpdateDialogOpen}
        updateType={updateType}
        selectedTasks={selectedTasks}
        onBatchUpdate={onBatchUpdate}
        taskCategories={taskCategories}
        users={users}
      />

      <BatchDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        selectedTasks={selectedTasks}
        onBatchDelete={onBatchDelete}
      />
    </>
  );
}
