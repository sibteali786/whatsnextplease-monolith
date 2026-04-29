/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { DurationEnum, DurationEnumList } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { transformEnumValue } from '@/utils/utils';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

import { Bookmark, CheckCircle, Dot, Filter, Plus, UserRoundX, UserX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Roles, SortDirection, TaskSortField, TaskViewFilter } from '@prisma/client';
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { usersList } from '@/db/repositories/users/usersList';
import { fetchClients } from '@/utils/clientActions';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { TasksByStatusFilters } from '@/utils/tasks/useTasksByStatus';
import { apiClient } from '@/lib/apiClient';
import { ApplyTaskViewFilterResponse } from '@/types/tasks/api-response';

const SORT_FIELDS = [
  { label: 'Start Date', value: TaskSortField.START_DATE },
  { label: 'End Date', value: TaskSortField.END_DATE },
  { label: 'Priority', value: TaskSortField.PRIORITY },
];

const SORT_ORDERS = [
  { label: 'Ascending', value: SortDirection.ASC },
  { label: 'Descending', value: SortDirection.DESC },
];
function parseSort(sortBy?: string) {
  const [field = '', order = ''] = sortBy?.split('-') ?? [];
  return { field, order };
}

const filterList: DurationEnumList = Object.values(DurationEnum).map(duration => ({
  label: duration,
  value: transformEnumValue(duration),
}));
interface ClientListItem {
  id: string;
  companyName: string | null;
  contactName: string | null;
  avatarUrl: string | null;
}

const FILTER_STORAGE_KEY = 'timelineFilter';
const VIEW_ID_STORAGE_KEY = 'viewId';

function saveFiltersToStorage(filters: TasksByStatusFilters) {
  sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
}

function getFiltersFromStorage(): TasksByStatusFilters {
  const stored = sessionStorage.getItem(FILTER_STORAGE_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

function saveViewIdToStorage(viewId?: string) {
  if (viewId) sessionStorage.setItem(VIEW_ID_STORAGE_KEY, viewId);
  else sessionStorage.removeItem(VIEW_ID_STORAGE_KEY);
}

function getViewIdFromStorage(): string | undefined {
  return sessionStorage.getItem(VIEW_ID_STORAGE_KEY) ?? undefined;
}
const TaskViewFilterComponent = ({ role }: { role?: Roles }) => {
  const { toast } = useToast();

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  /** Read values from URL */
  const [users, setUsers] = useState<Array<{ id: string; name: string; avatarUrl: string }>>([]);
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [views, setViews] = useState<TaskViewFilter[]>([]);
  const view = (searchParams.get('view') as 'timeline' | 'kanban') ?? 'timeline';
  const [currentViewFilter, setCurrentViewFilter] = useState<TaskViewFilter>();
  const [newViewName, setNewViewName] = useState('');

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);

  const [taskCategories, setTaskCategories] = useState<{ id: string; categoryName: string }[]>([]);

  // Filters state
  const [filters, setFilters] = useState<TasksByStatusFilters>(() => getFiltersFromStorage());
  const [viewId, setViewId] = useState<string | undefined>(() => getViewIdFromStorage());

  const { field, order } = parseSort(filters.sortBy);

  const updateParam = (key: string, value?: string, alwaysKeep = false) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentValue = params.get(key);

    if (!value) {
      params.delete(key);
    } else if (currentValue === value && !alwaysKeep) {
      // toggle off only if !alwaysKeep
      params.delete(key);
    } else {
      params.set(key, value);
    }

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Update a filter
  const updateFilter = (key: keyof TasksByStatusFilters, value?: string | DurationEnum) => {
    const params = new URLSearchParams(searchParams.toString());
    const newFilters = { ...filters, [key]: value };
    if (!value) delete newFilters[key];
    setFilters(newFilters);
    saveFiltersToStorage(newFilters);
    params.set('filtersUpdate', String(Date.now()));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };
  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    setFilters({});
    setViewId(undefined);
    sessionStorage.removeItem(FILTER_STORAGE_KEY);
    sessionStorage.removeItem(VIEW_ID_STORAGE_KEY);
    params.set('filtersUpdate', String(Date.now()));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };
  const handleAddView = async () => {
    if (!newViewName.trim()) return;

    try {
      const body = {
        /* status: selectedStatus ?? undefined, */

        name: newViewName.trim(),
        taskCategoryId: filters.categoryId,
        assignedToId: filters.assignedToId,
        clientId: filters.clientId,
        sortField: field || undefined,
        sortDirection: order || undefined,
      };

      const response = await apiClient.post<ApplyTaskViewFilterResponse>(
        '/preference/task-view-filter',
        body
      );

      if (!response.success) {
        const errorData = response?.error;
        console.log('errorData', errorData);
        throw new Error(errorData || 'Failed to save view');
      }
      if (response?.data) {
        setViews(prev => [...prev, response.data as TaskViewFilter]);
        setCurrentViewFilter(response.data);
        setViewId(response.data.id);
        saveViewIdToStorage(response.data.id);
        setNewViewName('');
        toast({
          title: 'View Saved Successfully',
          description: `View: ${response.data.name} has been created.`,
          variant: 'success',
          icon: <CheckCircle size={40} />,
        });
      }
    } catch (err) {
      console.error('Failed to create task view filter:', err);
      const errorMessage =
        err instanceof Error && err.message
          ? err.message
          : 'Your view could not be saved. Please try again.';
      toast({
        title: 'Failed to Save View',
        description: errorMessage,
        variant: 'destructive',
        icon: <UserX size={40} />,
      });
    }
  };

  const fetchViews = async () => {
    try {
      const viewsData = await apiClient.get<any>('/preference/task-view-filter');
      if (!viewsData) {
        throw new Error('Failed to fetch views');
      }
      setViews(viewsData.data);
    } catch (err) {
      console.error('Error fetching views:', err);
    }
  };

  useEffect(() => {
    /* Fetch categories */
    const fetchCategories = async () => {
      const categoriesData = await apiClient.get<any>('/taskCategory/all');
      if (!categoriesData) throw new Error('Failed to fetch task categories');
      setTaskCategories(categoriesData);
    };
    /* Fetch users */
    const fetchUsers = async (searchQuery?: string) => {
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
          setUsers(mappedUsers);
        }
        setLoadingUsers(false);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        setLoadingUsers(false);
      }
    };
    /* Fetch clients */
    const fetchClientsLocally = async () => {
      setLoadingClients(true);

      try {
        const res = await fetchClients(null, null, '');
        const newClients: ClientListItem[] = res?.clients || [];
        setClients(newClients);
      } catch (err) {
        console.error('Error fetching clients:', err);
      } finally {
        setLoadingClients(false);
      }
    };
    /* Fetch Saved Views */

    fetchCategories();
    fetchUsers();
    fetchClientsLocally();
    fetchViews();
  }, []);
  return (
    <div className="flex items-center gap-2 rounded-[16px] border px-3 py-1 w-fit">
      {Object.keys(filters).length !== 0 && (
        <Button variant={'destructive'} onClick={clearFilters} className="bg-opacity-40">
          Clear All
        </Button>
      )}

      {/* Filter Dropdown*/}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex gap-2 opacity-90 items-center p-2">
          <Filter className="w-5 h-5" />
          Filters
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {/* Task Type */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Type</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-[200px] overflow-y-auto">
              {['Internal', 'External'].map((type, index) => {
                const textColor = type === 'External' ? 'text-primary' : 'text-blue-500';
                return (
                  <DropdownMenuItem
                    key={index}
                    onSelect={() => updateFilter('taskType', type.toUpperCase())}
                    className={cn(
                      filters.taskType === type.toUpperCase() && 'bg-accent',
                      textColor
                    )}
                  >
                    {type}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* Category Filter */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Category</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-[200px] overflow-y-auto">
              {taskCategories.length > 0 ? (
                taskCategories.map(category => (
                  <DropdownMenuItem
                    key={category.id}
                    onSelect={() => updateFilter('categoryId', category.id)}
                    className={cn(filters.categoryId === category.id && 'bg-accent')}
                  >
                    {category.categoryName}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>No categories available</DropdownMenuItem>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {/* Status Filter */}
          {/*   <DropdownMenuSub>
            <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-[200px] overflow-y-auto">
              {Object.entries(TaskStatusEnum).map(([key, value]) => (
                <DropdownMenuItem
                  key={key}
                  onSelect={() => {
                    updateParam('status', value);
                  }}
                  className={cn(selectedStatus === value && 'bg-accent')}
                >
                  {transformEnumValue(value)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub> */}
          {/* Assignee Filter */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Assignee</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-[200px] overflow-y-auto">
              {loadingUsers ? (
                <DropdownMenuItem disabled>Loading users...</DropdownMenuItem>
              ) : users.length > 0 ? (
                <>
                  {users.map(user => (
                    <DropdownMenuItem
                      key={user.id}
                      onSelect={() => updateFilter('assignedToId', user.id)}
                      className={cn(filters.assignedToId === user.id && 'bg-accent')}
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
                    </DropdownMenuItem>
                  ))}
                </>
              ) : (
                <DropdownMenuItem disabled>
                  <div className="flex items-center gap-2">
                    <UserRoundX className="h-4 w-4" />
                    No users found
                  </div>
                </DropdownMenuItem>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {/* Client Filter */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Clients</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-[200px] overflow-y-auto">
              {loadingClients ? (
                <DropdownMenuItem disabled>Loading clients...</DropdownMenuItem>
              ) : clients.length > 0 ? (
                <>
                  {clients.map(client => (
                    <DropdownMenuItem
                      key={client.id}
                      onSelect={() => updateFilter('clientId', client.id)}
                      className={cn(filters.clientId === client.id && 'bg-accent')}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 rounded-lg">
                            <AvatarImage
                              src={client.avatarUrl || 'https://github.com/shadcn.png'}
                              alt={client.contactName ?? 'avatar'}
                              className="rounded-full"
                            />
                            <AvatarFallback className="rounded-full text-xs">
                              {client.contactName
                                ? client.contactName.substring(0, 2).toUpperCase()
                                : 'CL'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {client.contactName} ({client.companyName})
                          </span>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </>
              ) : (
                <DropdownMenuItem disabled>
                  <div className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">No Client</span>
                  </div>
                </DropdownMenuItem>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Sort By</DropdownMenuSubTrigger>

            <DropdownMenuSubContent className="w-56 rounded-lg p-2">
              {/* SORT BY */}
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Sort by</p>

              {SORT_FIELDS.map(item => (
                <DropdownMenuItem
                  key={item.value}
                  onSelect={e => {
                    e.preventDefault();
                    const nextOrder = order || SortDirection.ASC;
                    updateFilter('sortBy', `${item.value}-${nextOrder}`);
                  }}
                  className={cn(field === item.value && 'bg-accent')}
                >
                  {item.label}
                  {field === item.value && <Dot />}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              {/* ORDER */}
              {SORT_ORDERS.map(item => (
                <DropdownMenuItem
                  key={item.value}
                  onSelect={e => {
                    e.preventDefault();
                    if (!field) return;
                    updateFilter('sortBy', `${field}-${item.value}`);
                  }}
                  className={cn(order === item.value && 'bg-accent')}
                >
                  {item.label}
                  {order === item.value && <Dot />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Duration */}
      <Select
        value={filters.duration ?? DurationEnum.ALL}
        onValueChange={value => updateFilter('duration', value)}
      >
        <SelectTrigger
          className="h-[40px] px-4 flex justify-between items-center gap-3 w-fit *:
         border-0 shadow-none focus:ring-0 focus:ring-offset-0
        "
        >
          <SelectValue placeholder="Duration" />
        </SelectTrigger>
        <SelectContent>
          {filterList.map(duration => (
            <SelectItem key={duration.value} value={duration.label}>
              {duration.value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Saved View */}
      <Select
        value={viewId ?? ''}
        onValueChange={id => {
          if (id === viewId) {
            clearFilters();
            return;
          }

          const selectedView = views.find(v => v.id === id);
          if (!selectedView) return;

          setFilters({
            categoryId: selectedView.taskCategoryId ?? undefined,
            assignedToId: selectedView.assignedToId ?? undefined,
            clientId: selectedView.clientId ?? undefined,
            sortBy:
              selectedView.sortField && selectedView.sortDirection
                ? `${selectedView.sortField}-${selectedView.sortDirection}`
                : undefined,
          });
          saveFiltersToStorage({
            categoryId: selectedView.taskCategoryId ?? undefined,
            assignedToId: selectedView.assignedToId ?? undefined,
            clientId: selectedView.clientId ?? undefined,
            sortBy:
              selectedView.sortField && selectedView.sortDirection
                ? `${selectedView.sortField}-${selectedView.sortDirection}`
                : undefined,
          });

          setViewId(selectedView.id);
          saveViewIdToStorage(selectedView.id);
          setCurrentViewFilter(selectedView);
          const params = new URLSearchParams(searchParams.toString());

          params.set('filtersUpdate', String(Date.now()));
          router.push(`${pathname}?${params.toString()}`, { scroll: false });
        }}
      >
        <SelectTrigger
          className="h-[40px] px-4 flex justify-between items-center gap-3 w-fit *:
         border-0 shadow-none focus:ring-0 focus:ring-offset-0
        "
        >
          <Bookmark className="h-5 w-5" />
          <SelectValue placeholder="Saved Views" />
        </SelectTrigger>
        <SelectContent>
          {views.length === 0 ? (
            <SelectItem disabled value="no-result">
              No Saved Views
            </SelectItem>
          ) : (
            views.map(view => (
              <SelectItem
                key={view.id}
                value={view.id}
                className={cn(currentViewFilter?.id === view.id && 'bg-accent')}
              >
                {view.name}
              </SelectItem>
            ))
          )}

          <Separator />
          <div className=" mt-1 pt-2 px-2 flex items-center gap-2 h-[50px]">
            <Button onClick={handleAddView} className="p-1 h-[25px] w-[25px] b-0">
              <Plus className="w-4 h-4" />
            </Button>
            <Input
              placeholder="New view name"
              value={newViewName}
              onChange={e => setNewViewName(e.target.value)}
              onKeyDownCapture={e => {
                e.stopPropagation();
                if (e.key === 'Enter') handleAddView();
              }}
              className="flex-1 border-b bg-transparent focus:ring-1 focus:ring-blue-500 focus:outline-none h-full"
            />
          </div>
        </SelectContent>
      </Select>
      <div className="h-[80%] w-[1px] opacity-10 bg-white" />

      {/* View Toggle */}
      <Button
        variant={view === 'timeline' ? 'default' : 'outline'}
        onClick={() => updateParam('view', 'timeline', true)} // alwaysKeep = true
      >
        Timeline
      </Button>

      <Button
        variant={view === 'kanban' ? 'default' : 'outline'}
        onClick={() => updateParam('view', 'kanban', true)} // alwaysKeep = true
      >
        Kanban
      </Button>
    </div>
  );
};
export default TaskViewFilterComponent;
