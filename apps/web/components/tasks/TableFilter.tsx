'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { MultiSelect } from '../ui/multi-select';
import { TaskStatusEnum, TaskPriorityEnum, Roles } from '@prisma/client';
import { transformEnumValue } from '@/utils/utils';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { usersList } from '@/db/repositories/users/usersList';
import { Input } from '../ui/input';
import { Search, UserRoundX } from 'lucide-react';
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
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; avatarUrl: string }>>(
    []
  );
  const [filteredUsers, setFilteredUsers] = useState<
    Array<{ id: string; name: string; avatarUrl: string }>
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [hasMore, setHasMore] = useState<boolean | undefined>(true);
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
    <div className="flex gap-4">
      {/* Show hint when Type filter is disabled */}
      {isSpecificUserSelected && (
        <span className="text-xs text-muted-foreground self-center">
          (Type filter disabled - specific user selected)
        </span>
      )}
      {/* Assigned To Filter - Only for non-clients */}
      {
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
          onOpenChange={open => {
            if (open) {
              requestAnimationFrame(() => {
                searchInputRef.current?.focus();
              });
            }
          }}
        >
          <SelectTrigger className="h-[40px] px-4 flex justify-between items-center gap-3 w-fit">
            <SelectValue placeholder="Assigned To" />
          </SelectTrigger>
          <SelectContent onKeyDownCapture={e => e.stopPropagation()}>
            <SelectItem value="all">All Tasks</SelectItem>
            {role !== Roles.CLIENT && !userId && <SelectItem value="my-tasks">My Tasks</SelectItem>}
            <SelectItem value="null">Unassigned</SelectItem>
            <SelectItem value="not-null">Assigned</SelectItem>
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                Specific Users
              </div>
              <div className="relative w-[200px]">
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
            </>
            {loadingUsers ? (
              <SelectItem value="loading" disabled>
                Loading users...
              </SelectItem>
            ) : filteredUsers.length > 0 ? (
              <>
                {filteredUsers.map(user => (
                  <SelectItem key={user.id} value={user.id} className="pl-4">
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
                  </SelectItem>
                ))}
              </>
            ) : (
              <SelectItem value="no-results" disabled>
                <div className="flex items-center gap-2">
                  <UserRoundX className="h-4 w-4" />
                  No users found
                </div>
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      }

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
