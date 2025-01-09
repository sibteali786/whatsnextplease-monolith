"use client";
import { useCallback, useEffect, useState } from "react";
import { SearchNFilter } from "../common/SearchNFilter";
import { DurationEnum, DurationEnumList } from "@/types";
import { Roles } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { UserTasksTable } from "../users/UserTaskTable";
import { tasksByType } from "@/db/repositories/tasks/tasksByType";
import { useToast } from "@/hooks/use-toast";
import { CircleX } from "lucide-react";
import { taskIdsByType } from "@/db/repositories/tasks/taskIdsByType";
import { TaskTable } from "@/utils/validationSchemas";

export const TaskSuperVisorList = ({
  listOfFilter,
  role,
}: {
  userId: string;
  listOfFilter?: DurationEnumList;
  role: Roles;
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [duration, setDuration] = useState<DurationEnum>(DurationEnum.ALL);
  const [pageSize, setPageSize] = useState<number>(10);
  const [cursor, setCursor] = useState<string | null>(null);
  const [data, setData] = useState<TaskTable[] | null>([]);
  const [taskIds, setTaskIds] = useState<string[] | null>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number | undefined>(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"all" | "assigned" | "unassigned">(
    "unassigned",
  );
  const { toast } = useToast();
  const handleSearch = (term: string, duration: DurationEnum) => {
    setSearchTerm(term);
    setDuration(duration);
  };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await tasksByType(
        activeTab, // Pass the current tab as "type"
        role,
        cursor,
        pageSize,
        searchTerm,
        duration,
      );
      const responseIds = await taskIdsByType(
        activeTab,
        role,
        searchTerm,
        duration,
      );
      console.log(response);
      if (response && responseIds && response.success && responseIds.success) {
        setData(response.tasks);
        setTaskIds(responseIds.taskIds);
        setTotalCount(response.totalCount);
      }

      if (!response.success) {
        toast({
          variant: "destructive",
          title: `Failed to fetch ${activeTab} tasks`,
          description: response.details.originalError,
          icon: <CircleX size={40} />,
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        toast({
          variant: "destructive",
          title: `Failed to fetch ${activeTab} tasks`,
          description: "Something went wrong!",
          icon: <CircleX size={40} />,
        });
      }
    }
    setLoading(false);
  }, [activeTab, searchTerm, duration, pageSize, cursor]);

  // Fetch tasks when tab, searchTerm, duration, pageSize, or cursor changes

  useEffect(() => {
    console.log("useEffect triggered by:", {
      activeTab,
      searchTerm,
      duration,
      pageSize,
      cursor,
    });
    fetchTasks();
  }, [activeTab, searchTerm, duration, pageSize, cursor]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search and Filter */}
      <SearchNFilter onSearch={handleSearch} filterList={listOfFilter} />

      {/* Tabs for Task Types */}
      <Tabs
        defaultValue="unassigned"
        className="w-full"
        onValueChange={(value) => {
          setActiveTab(value as "all" | "assigned" | "unassigned");
          setCursor(null); // Reset cursor when tab changes
        }}
      >
        <TabsList className="flex gap-4 bg-transparent items-start justify-start">
          <TabsTrigger value="all" className="text-sm">
            All
          </TabsTrigger>
          <TabsTrigger value="unassigned" className="text-sm">
            Unassigned
          </TabsTrigger>
          <TabsTrigger value="assigned" className="text-sm">
            Assigned
          </TabsTrigger>
        </TabsList>

        {/* Tabs Content */}
        <TabsContent value="all">
          <UserTasksTable
            data={data ?? []}
            pageSize={pageSize}
            loading={loading}
            totalCount={totalCount}
            cursor={cursor}
            setCursor={setCursor}
            showDescription={true}
            setPageSize={setPageSize}
            pageIndex={pageIndex}
            setPageIndex={setPageIndex}
            taskIds={taskIds ?? []}
            role={role}
          />
        </TabsContent>

        <TabsContent value="unassigned">
          <UserTasksTable
            data={data ?? []}
            pageSize={pageSize}
            loading={loading}
            totalCount={totalCount}
            cursor={cursor}
            setCursor={setCursor}
            showDescription={true}
            setPageSize={setPageSize}
            pageIndex={pageIndex}
            setPageIndex={setPageIndex}
            taskIds={taskIds ?? []}
            role={role}
          />
        </TabsContent>

        <TabsContent value="assigned">
          <UserTasksTable
            data={data ?? []}
            pageSize={pageSize}
            loading={loading}
            totalCount={totalCount}
            cursor={cursor}
            setCursor={setCursor}
            showDescription={true}
            setPageSize={setPageSize}
            pageIndex={pageIndex}
            setPageIndex={setPageIndex}
            taskIds={taskIds ?? []}
            role={role}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
