'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { MultiSelect } from '../ui/multi-select';
import { TaskStatusEnum, TaskPriorityEnum, Roles } from '@prisma/client';
import { getCookie, transformEnumValue } from '@/utils/utils';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COOKIE_NAME } from '@/utils/constant';
export default function TableFilter({
  role,
  statusFilter,
}: {
  role?: Roles;
  statusFilter?: TaskStatusEnum[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [selectedType, setSelectedType] = useState<string>('unassigned');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const assignedToValue = searchParams.get('assignedTo') || 'all';
  const isSpecificUserSelected =
    assignedToValue !== 'all' &&
    assignedToValue !== 'my-tasks' &&
    assignedToValue !== 'null' &&
    assignedToValue !== 'not-null';
  const updateParams = (key: string, values: string[] | string) => {
    const currentParams = new URLSearchParams(searchParams.toString());
    if (Array.isArray(values)) {
      if (values.length > 0) currentParams.set(key, values.join(','));
      else currentParams.delete(key);
    } else {
      if (values && values !== 'All') currentParams.set(key, values);
      else currentParams.delete(key);
    }

    router.push(`${pathname}?${currentParams.toString()}`);
  };

  // Handle type change
  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    updateParams('type', value);
  };
  // handle Status change
  const handleStatusChange = (value: string[]) => {
    setSelectedStatus(value);
    updateParams('status', value);
  };

  // handle Priority change
  const handlePriorityChange = (value: string[]) => {
    setSelectedPriority(value);
    updateParams('priority', value);
  };
  useEffect(() => {
    const typeParam = searchParams.get('type');
    const statusParam = searchParams.get('status');
    const priorityParam = searchParams.get('priority');

    setSelectedType(typeParam || 'unassigned');
    setSelectedStatus(statusParam ? decodeURIComponent(statusParam).split(',') : []);
    setSelectedPriority(priorityParam ? decodeURIComponent(priorityParam).split(',') : []);
  }, [searchParams]);

  useEffect(() => {
    const fetchUsers = async () => {
      // Only fetch users for non-client roles
      if (role === Roles.CLIENT) return;

      setLoadingUsers(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/taskAgents/list`, {
          headers: {
            Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.users) {
            setUsers(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              result.users.map((u: any) => ({
                id: u.id,
                name: `${u.firstName} ${u.lastName}`,
              }))
            );
          }
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [role]);
  return (
    <div className="flex gap-4">
      {/* Type Filter (assigned, unassigned etc.) */}

      <Select
        onValueChange={handleTypeChange}
        value={selectedType}
        disabled={isSpecificUserSelected}
      >
        <SelectTrigger className="h-[40px] px-4 flex justify-between items-center gap-3 w-fit">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          {(role === Roles.CLIENT
            ? ['all', 'assigned', 'unassigned']
            : ['all', 'assigned', 'unassigned', 'my-tasks']
          ).map(value => (
            <SelectItem key={value} value={value} className="pr-10">
              {
                value
                  .split('-') // ["my", "tasks"]
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // ["My", "Tasks"]
                  .join(' ') // "My Tasks"
              }
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* Show hint when Type filter is disabled */}
      {isSpecificUserSelected && (
        <span className="text-xs text-muted-foreground self-center">
          (Type filter disabled - specific user selected)
        </span>
      )}
      {/* Assigned To Filter - Only for non-clients */}
      {role !== Roles.CLIENT && (
        <Select
          onValueChange={value => {
            const currentParams = new URLSearchParams(searchParams.toString());
            if (value === 'all') {
              currentParams.delete('assignedTo');
            } else {
              currentParams.set('assignedTo', value);
            }
            router.push(`${pathname}?${currentParams.toString()}`);
          }}
          value={searchParams.get('assignedTo') || 'all'}
        >
          <SelectTrigger className="h-[40px] px-4 flex justify-between items-center gap-3 w-fit">
            <SelectValue placeholder="Assigned To" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="my-tasks">My Tasks</SelectItem>
            <SelectItem value="null">Unassigned</SelectItem>
            <SelectItem value="not-null">Assigned to Anyone</SelectItem>

            {loadingUsers ? (
              <SelectItem value="loading" disabled>
                Loading users...
              </SelectItem>
            ) : users.length > 0 ? (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                  Specific Users
                </div>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id} className="pl-4">
                    {user.name}
                  </SelectItem>
                ))}
              </>
            ) : null}
          </SelectContent>
        </Select>
      )}

      {/* Status Filter */}
      <MultiSelect
        options={(statusFilter && statusFilter.length > 0
          ? statusFilter // show only passed statuses
          : Object.values(TaskStatusEnum)
        ) // default: show all
          .map(value => ({
            label: transformEnumValue(value),
            value: value,
          }))}
        onValueChange={handleStatusChange}
        value={selectedStatus}
        placeholder="Status"
        maxCount={1}
      />
      {/*  Priority Filter */}
      <MultiSelect
        options={Object.entries(TaskPriorityEnum).map(([, value]) => ({
          label: transformEnumValue(value),
          value: value,
        }))}
        onValueChange={handlePriorityChange}
        value={selectedPriority}
        placeholder="Priority"
        maxCount={1}
      />
    </div>
  );
}
