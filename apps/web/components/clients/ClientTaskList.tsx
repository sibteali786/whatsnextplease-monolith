'use client';

import { useEffect, useState } from 'react';
import { UserTasksTable } from '../users/UserTaskTable';
import { getTasksByClientId } from '@/db/repositories/clients/getTasksByClientId';
import { getTaskIdsByClientId } from '@/utils/clientActions';
import { SearchNFilter } from '../common/SearchNFilter';
import { Roles } from '@prisma/client';
import { TaskTable } from '@/utils/validationSchemas';

export default function ClientTaskList({ clientId }: { clientId: string }) {
  const [data, setData] = useState<TaskTable[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await getTasksByClientId(clientId, cursor, pageSize);
      const responseIds = await getTaskIdsByClientId(clientId);

      if (response.success && responseIds.success && response.tasks) {
        const filteredTasks = response.tasks.filter(task => task.status.statusName !== 'COMPLETED');
        setData(filteredTasks);
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
  }, [cursor, pageSize, searchTerm]);

  return (
    <div className="flex flex-col gap-4">
      <SearchNFilter onSearch={term => setSearchTerm(term)} />
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
        role={Roles.CLIENT}
        showAsModal={true}
      />
    </div>
  );
}
