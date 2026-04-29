'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { MultiSelect } from '../ui/multi-select';
import { TaskStatusEnum, TaskPriorityEnum, Roles } from '@prisma/client';
import { transformEnumValue } from '@/utils/utils';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { usersList } from '@/db/repositories/users/usersList';
import { Input } from '../ui/input';
import { ChevronDown, Search, UserRoundX } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

export default function TableFilter({
  role,
  statusFilter,
  userId,
}: {
  role?: Roles;
  statusFilter?: TaskStatusEnum[];
  userId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const view = (searchParams.get('view') as 'list' | 'timeline' | 'kanban') ?? 'list';

  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; avatarUrl: string }>>(
    []
  );
  const [filteredUsers, setFilteredUsers] = useState<
    Array<{ id: string; name: string; avatarUrl: string }>
  >([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [hasMore, setHasMore] = useState<boolean | undefined>(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const taskType = searchParams.get('taskType');
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

  const getAssignedLabel = () => {
    if (assignedToValue === 'my-tasks') return 'My Tasks';
    if (assignedToValue === 'null') return 'Unassigned';
    if (assignedToValue === 'not-null') return 'Assigned';

    const selectedUser = filteredUsers.find(u => u.id === assignedToValue);
    if (selectedUser) return selectedUser.name;

    return 'All Tasks';
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
    const statusParam = searchParams.get('status');
    const priorityParam = searchParams.get('priority');

    setSelectedStatus(statusParam ? decodeURIComponent(statusParam).split(',') : []);
    setSelectedPriority(priorityParam ? decodeURIComponent(priorityParam).split(',') : []);
  }, [searchParams]);

  useEffect(() => {
    const fetchUsers = async (pageToFetch?: number, searchQuery?: string) => {
      // Only fetch users for non-client roles
      if (role === Roles.CLIENT || role === Roles.TASK_AGENT) return;
      if (!pageToFetch && (loadingUsers || !hasMore)) return; // Prevent multiple fetches
      setLoadingUsers(true);

      try {
        const response = await usersList(
          role ?? Roles.TASK_SUPERVISOR,
          [], // skills
          0, //limit
          1,
          searchQuery
        );
        if (response.success) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mappedUsers = response.users.map((u: any) => ({
            id: String(u.id), // ensure string
            name: `${u.firstName} ${u.lastName}`,
            avatarUrl: u.avatarUrl ?? '', // or a fallback image
          }));
          setAllUsers(mappedUsers);
          setFilteredUsers(mappedUsers);

          setHasMore(response.hasMore);
        }
        setLoadingUsers(false);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [role]);
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(allUsers);
      return;
    }

    const lowerQuery = searchQuery.toLowerCase();

    setFilteredUsers(allUsers.filter(user => user.name.toLowerCase().includes(lowerQuery)));
  }, [searchQuery, allUsers]);

  return (
    <>
      {/* Show hint when Type filter is disabled */}
      {isSpecificUserSelected && (
        <span className="text-xs text-muted-foreground self-center">
          (Type filter disabled - specific user selected)
        </span>
      )}
      {/* Assigned To Filter - Only for non-clients */}
      {
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 w-fit gap-2'
              )}
            >
              {/* Avatar (only if specific user selected) */}
              {isSpecificUserSelected && (
                <Avatar className="h-5 w-5">
                  <AvatarImage
                    src={
                      filteredUsers.find(u => u.id === assignedToValue)?.avatarUrl ||
                      'https://github.com/shadcn.png'
                    }
                  />
                  <AvatarFallback className="text-xs">
                    {filteredUsers.find(u => u.id === assignedToValue)?.name}
                  </AvatarFallback>
                </Avatar>
              )}

              <span className="truncate">{getAssignedLabel()}</span>

              <ChevronDown className="h-4 w-4 opacity-50" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className={cn(
              'relative z-50 w-64 rounded-md border bg-popover text-popover-foreground shadow-md p-1 max-h-[385px] overflow-y-auto'
            )}
            align="start"
          >
            <div className="flex flex-col gap-0.5">
              <DropdownMenuCheckboxItem
                checked={taskType === 'INTERNAL'}
                onCheckedChange={() =>
                  updateParams('taskType', taskType === 'INTERNAL' ? '' : 'INTERNAL')
                }
                className={`text-blue-500 ${taskType === 'INTERNAL' ? 'bg-accent text-accent-foreground' : ''}`}
              >
                Internal
              </DropdownMenuCheckboxItem>

              <DropdownMenuCheckboxItem
                checked={taskType === 'EXTERNAL'}
                onCheckedChange={() =>
                  updateParams('taskType', taskType === 'EXTERNAL' ? '' : 'EXTERNAL')
                }
                className={`text-primary ${taskType === 'EXTERNAL' ? 'bg-accent text-accent-foreground' : ''}`}
              >
                External
              </DropdownMenuCheckboxItem>
            </div>
            <DropdownMenuSeparator />

            {/* ASSIGNED TO */}
            <div className="flex flex-col gap-0.5">
              <DropdownMenuCheckboxItem
                checked={assignedToValue === 'all'}
                onCheckedChange={() => updateParams('assignedTo', '')}
                className={`${assignedToValue === 'all' ? 'bg-accent text-accent-foreground' : ''}`}
              >
                All Tasks
              </DropdownMenuCheckboxItem>

              {role !== Roles.CLIENT && !userId && (
                <DropdownMenuCheckboxItem
                  checked={assignedToValue === 'my-tasks'}
                  onCheckedChange={() => updateParams('assignedTo', 'my-tasks')}
                  className={`${assignedToValue === 'my-tasks' ? 'bg-accent text-accent-foreground' : ''}`}
                >
                  My Tasks
                </DropdownMenuCheckboxItem>
              )}

              <DropdownMenuCheckboxItem
                checked={assignedToValue === 'null'}
                onCheckedChange={() => updateParams('assignedTo', 'null')}
                className={`${assignedToValue === 'null' ? 'bg-accent text-accent-foreground' : ''}`}
              >
                Unassigned
              </DropdownMenuCheckboxItem>

              <DropdownMenuCheckboxItem
                checked={assignedToValue === 'not-null'}
                onCheckedChange={() => updateParams('assignedTo', 'not-null')}
                className={`${assignedToValue === 'not-null' ? 'bg-accent text-accent-foreground' : ''}`}
              >
                Assigned
              </DropdownMenuCheckboxItem>
            </div>
            {/* USERS */}
            {role !== Roles.CLIENT && role !== Roles.TASK_AGENT && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-2 pt-2">
                  Specific Users
                </div>

                <div className="relative w-full mb-1">
                  <Input
                    value={searchQuery}
                    placeholder="Search users"
                    className="pl-10 border-6 border-b-2 rounded-none 
             focus:outline-none focus:ring-0 focus:border-b-2 focus:border-gray-300 focus-visible:ring-0 "
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      e.stopPropagation();
                    }}
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4" />
                </div>

                {loadingUsers ? (
                  <div className="px-2 py-1 text-sm">Loading users...</div>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <DropdownMenuCheckboxItem
                      key={user.id}
                      checked={assignedToValue === user.id}
                      onCheckedChange={() => updateParams('assignedTo', user.id)}
                      className={`px-4 ${assignedToValue === user.id ? 'bg-accent text-accent-foreground pl-8' : ''}`}
                    >
                      <div className="flex flex-row items-start gap-2">
                        <Avatar className="h-6 w-6 rounded-lg">
                          <AvatarImage
                            src={user.avatarUrl || 'https://github.com/shadcn.png'}
                            alt={user.name ?? 'avatar'}
                            className="rounded-full"
                          />
                          <AvatarFallback className="rounded-full text-xs">
                            {user.name}
                          </AvatarFallback>
                        </Avatar>
                        {user.name}
                      </div>
                    </DropdownMenuCheckboxItem>
                  ))
                ) : (
                  <div className="px-2 py-1 text-sm flex items-center gap-2">
                    <UserRoundX className="h-4 w-4" />
                    No users found
                  </div>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      }

      {/* Status Filter */}
      {view !== 'kanban' && (
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
      )}

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
      {/* View Toggle */}
      <div className="flex gap-2 flex-wrap w-full justify-end">
        <Button
          variant={view === 'list' ? 'default' : 'outline'}
          onClick={() => updateParams('view', 'list')}
          size={'sm'}
        >
          List
        </Button>
        <Button
          variant={view === 'timeline' ? 'default' : 'outline'}
          onClick={() => updateParams('view', 'timeline')}
          size={'sm'}
        >
          Timeline
        </Button>

        <Button
          variant={view === 'kanban' ? 'default' : 'outline'}
          onClick={() => updateParams('view', 'kanban')}
          size={'sm'}
        >
          Kanban
        </Button>
      </div>
    </>
  );
}
