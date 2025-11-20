'use client';

import { useEffect, useState } from 'react';
import { UserTasksTable } from '../users/UserTaskTable';
import { getTasksByClientId } from '@/db/repositories/clients/getTasksByClientId';
import { getTaskIdsByClientId } from '@/utils/clientActions';
import { SearchNFilter } from '../common/SearchNFilter';
import { Roles, TaskPriorityEnum, TaskStatusEnum } from '@prisma/client';
import { TaskTable } from '@/utils/validationSchemas';
import { DurationEnum, DurationEnumList } from '@/types';
import { transformEnumValue } from '@/utils/utils';
import { useSearchParams } from 'next/navigation';

export default function ClientTaskList({ clientId, role }: { clientId: string; role: Roles }) {
  const searchParams = useSearchParams();

  const [data, setData] = useState<TaskTable[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [duration, setDuration] = useState<DurationEnum>(DurationEnum.ALL);
  const listToFilterUpon: DurationEnumList = Object.values(DurationEnum).map(duration => ({
    label: duration,
    value: transformEnumValue(duration),
  }));
  const statusFilter = searchParams.get('status');
  const priorityFilter = searchParams.get('priority');
  const typeFilter: 'all' | 'assigned' | 'unassigned' | 'my-tasks' = searchParams.get('type') as
    | 'all'
    | 'assigned'
    | 'unassigned'
    | 'my-tasks';
  const fetchTasks = async () => {
    setLoading(true);
    try {
      // Split the comma-separated status values
      const statusArray = statusFilter?.split(',') || [];
      const priorityArray = priorityFilter?.split(',') || [];

      // If there are status values, map them to TaskStatusEnum
      const normalizedStatus = statusArray
        ? statusArray
            .map((status: string) => TaskStatusEnum[status as keyof typeof TaskStatusEnum] || null)
            .filter(status => status !== null)
        : [];
      const normalizedPriority = priorityArray
        ? priorityArray
            .map(
              (priority: string) =>
                TaskPriorityEnum[priority as keyof typeof TaskPriorityEnum] || null
            )
            .filter(priority => priority !== null)
        : [];
      const response = await getTasksByClientId(
        typeFilter ?? 'unassigned',

        searchTerm,
        duration,
        clientId,
        cursor,
        pageSize,
        normalizedStatus,
        normalizedPriority
      );
      const responseIds = await getTaskIdsByClientId(
        typeFilter ?? 'unassigned',
        searchTerm,
        duration,
        clientId
      );

      if (response.success && responseIds.success && response.tasks) {
        /*         const filteredTasks = response.tasks.filter(task => task.status.statusName !== 'COMPLETED'); */
        setData(response.tasks || []);
        if (response.totalCount) {
          setTotalCount(response.totalCount);
        }
        setTaskIds(responseIds.taskIds ?? []);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, [cursor, pageSize, searchTerm, duration, statusFilter, priorityFilter, typeFilter]);
  const handleSearch = (term: string, duration: DurationEnum) => {
    setSearchTerm(term); // Update the search term when user searches
    setDuration(duration);
  };
  return (
    <div className="flex flex-col gap-4">
      <SearchNFilter onSearch={handleSearch} filterList={listToFilterUpon} role={Roles.CLIENT} />
      <UserTasksTable
        data={data}
        pageSize={pageSize}
        loading={loading}
        totalCount={totalCount}
        cursor={cursor}
        setCursor={setCursor}
        pageIndex={pageIndex}
        setPageIndex={setPageIndex}
        showDescription={true}
        setPageSize={setPageSize}
        taskIds={taskIds}
        role={role}
        showAsModal={true}
        fetchTasks={fetchTasks}
      />
    </div>
  );
}
