import { useState, useEffect } from 'react';
import { TaskPriorityEnum } from '@prisma/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { SearchNFilter } from '../common/SearchNFilter';
import { Roles } from '@prisma/client';
import { UserTasksTable } from '../users/UserTaskTable';
import { TaskTable } from '@/utils/validationSchemas';
import { getTaskIdsByPriority } from '@/utils/taskTools';
import { transformEnumValue } from '@/utils/utils';
import { DurationEnum, DurationEnumList } from '@/types';
import { State } from '@/components/DataState';
import { taskApiClient } from '@/utils/taskApi';

interface TasksListModalProps {
  open: boolean;
  setOpen: (value: boolean) => void;
  priority: TaskPriorityEnum;
}

export default function TasksListModal({ open, setOpen, priority }: TasksListModalProps) {
  const [data, setData] = useState<TaskTable[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [duration, setDuration] = useState<DurationEnum>(DurationEnum.ALL);
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = (term: string, durationFilter: DurationEnum = DurationEnum.ALL) => {
    setSearchTerm(term);
    setDuration(durationFilter);
  };

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await taskApiClient.getTasksByPriorityLevel(priority, {
        cursor: cursor ?? undefined,
        pageSize,
        search: searchTerm,
      });
      const responseIds = await getTaskIdsByPriority(priority);

      if (response.success && responseIds && response.tasks) {
        setData(response.tasks);
        if (responseIds.taskIds) {
          setTaskIds(responseIds.taskIds);
        }
        setTotalCount(response.totalCount ?? 0);
      } else {
        setError(response.message || 'Failed to fetch tasks');
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      setError('An unexpected error occurred while fetching tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTasks();
    }
  }, [open, cursor, pageSize, searchTerm, duration, priority]);
  const listToFilterUpon: DurationEnumList = Object.values(DurationEnum).map(duration => ({
    label: duration,
    value: transformEnumValue(duration),
  }));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[80%] max-h-[90vh] overflow-hidden flex flex-col px-0">
        <DialogHeader className="flex flex-row items-center justify-start gap-6 px-6 pb-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0"
            onClick={() => setOpen(false)}
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
          <DialogTitle className="text-2xl font-bold">
            {transformEnumValue(priority)} Tasks
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="px-6">
            <SearchNFilter onSearch={handleSearch} filterList={listToFilterUpon} />
          </div>

          <div className="flex-1 overflow-auto px-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <State
                variant="destructive"
                icon={Loader2}
                title="Error Loading Tasks"
                description={error}
                ctaText="Try Again"
                onCtaClick={fetchTasks}
              />
            ) : (
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
                role={Roles.SUPER_USER}
                taskIds={taskIds}
                fetchTasks={fetchTasks}
                showAsModal={true}
              />
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
