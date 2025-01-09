import { useState, useEffect } from "react";
import { TaskPriorityEnum } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { ArrowLeft } from "lucide-react";
import { SearchNFilter } from "../common/SearchNFilter";
import { getTasksListByPriority } from "@/db/repositories/tasks/getTaskListByPriority";
import { Roles } from "@prisma/client";
import { UserTasksTable } from "../users/UserTaskTable";
import { TaskTable } from "@/utils/validationSchemas";
import { getTaskIdsByPriority } from "@/utils/taskTools";
import { transformEnumValue } from "@/utils/utils";

interface TasksListModalProps {
  open: boolean;
  setOpen: (value: boolean) => void;
  priority: TaskPriorityEnum;
}

export default function TasksListModal({
  open,
  setOpen,
  priority,
}: TasksListModalProps) {
  const [data, setData] = useState<TaskTable[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await getTasksListByPriority(
        priority,
        cursor,
        pageSize,
        searchTerm,
      );
      const responseIds = await getTaskIdsByPriority(priority);
      if (response.success && responseIds && response.tasks) {
        console.log(response.tasks);
        setData(response.tasks);
        if (responseIds.taskIds) {
          setTaskIds(responseIds.taskIds);
        }
        setTotalCount(response.totalCount ?? 0);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, [cursor, pageSize, searchTerm, priority]);

  return (
    <Dialog open={open} onOpenChange={() => setOpen(false)}>
      <DialogContent className="max-w-[70%] max-h-[98%] overflow-hidden px-0">
        <DialogHeader className="flex flex-row items-center justify-start gap-6 px-6">
          <DialogTrigger asChild>
            <ArrowLeft className="cursor-pointer" />
          </DialogTrigger>
          <DialogTitle className="text-2xl">
            {transformEnumValue(priority)} Tasks
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="px-6">
            <SearchNFilter onSearch={(term) => setSearchTerm(term)} />
          </div>
          <div className="max-h-[70vh] overflow-auto px-6">
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
              taskIds={taskIds ?? []}
            />
          </div>
        </div>

        <DialogFooter className="mt-6 px-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
