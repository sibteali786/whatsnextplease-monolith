'use client';
import { State } from '@/components/DataState';
import { Button } from '@/components/ui/button';
import { Tabs, TabsTrigger } from '@/components/ui/tabs';
import { TabsContent, TabsList } from '@radix-ui/react-tabs';
import { CircleX, Info, Loader2, Plus } from 'lucide-react';
import { DataTable } from './data-table';
import { columnsSkillCategory } from './columns-skill-category';
import { ErrorResponse, SkillCategories, TaskCategories } from '@wnp/types';
import { useEffect, useState } from 'react';
import { COOKIE_NAME } from '@/utils/constant';
import { getCookie } from '@/utils/utils';
import { PicklistContainer } from '@/components/picklists/PicklistContainer';
import { generateTaskCategoryColumns } from './columns-task-category';
import TaskDetailsDialog from '@/components/tasks/TaskDetailsDialog';
import { useSelectedTaskId } from '@/store/useTaskStore';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function Picklists() {
  const [isError, setIsError] = useState(false);
  const [skillCategories, setSkillCategories] = useState<SkillCategories[] | ErrorResponse>([]);
  const [taskCategories, setTaskCategories] = useState<TaskCategories[] | ErrorResponse>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [openSkillDialog, setOpenSkillDialog] = useState(false);
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const { selectedTaskId, setSelectedTaskId } = useSelectedTaskId();
  const columnTaskCategories = generateTaskCategoryColumns(setOpenDetailsDialog, setSelectedTaskId);
  const fetchDetails = async () => {
    setIsLoading(true);
    const token = getCookie(COOKIE_NAME);
    try {
      const [skillResponse, taskResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/skillCategory/all`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/taskCategory/all`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const [skillData, taskData] = await Promise.all([skillResponse.json(), taskResponse.json()]);

      if ('code' in skillData || 'code' in taskData) {
        setIsError(true);
        return;
      }

      setSkillCategories(skillData);
      setTaskCategories(taskData);
    } catch (error) {
      console.log(error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, []);

  if (isError) {
    return (
      <div className="flex flex-col">
        <State
          icon={CircleX}
          variant={'destructive'}
          title="Categories"
          description={'Failed to fetch categories, Try refreshing the page'}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">PICKLISTS</h1>
      <div>
        <Tabs defaultValue="skills">
          <TabsList className="grid w-[50%] grid-cols-2">
            <TabsTrigger value="skills">Skill Categories</TabsTrigger>
            <TabsTrigger value="tasks">Task Categories</TabsTrigger>
          </TabsList>
          <TabsContent value="skills">
            <div className="mt-4 space-y-4 flex flex-col">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium">Skill Categories</h2>
                <Button className="gap-2" onClick={() => setOpenSkillDialog(true)}>
                  <Plus className="w-4 h-4" />
                  Add Skill Category
                </Button>
              </div>
              {!isLoading ? (
                <DataTable
                  data={skillCategories as SkillCategories[]}
                  columns={columnsSkillCategory}
                />
              ) : (
                <div className="flex items-center justify-center h-[50vh]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="tasks">
            <div className="mt-4 space-y-4 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-medium">Task Categories</h2>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Click on the Tasks badge to see details for that task
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Button className="gap-2" onClick={() => setOpenTaskDialog(true)}>
                  <Plus className="w-4 h-4" />
                  Add Task Category
                </Button>
              </div>
              {!isLoading ? (
                <DataTable
                  data={taskCategories as TaskCategories[]}
                  columns={columnTaskCategories}
                />
              ) : (
                <div className="flex items-center justify-center h-[50vh]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Picklist Container with Dialog Forms */}
        <PicklistContainer
          openSkillDialog={openSkillDialog}
          setOpenSkillDialog={setOpenSkillDialog}
          openTaskDialog={openTaskDialog}
          setOpenTaskDialog={setOpenTaskDialog}
          onSuccess={fetchDetails}
        />
        <TaskDetailsDialog
          taskId={selectedTaskId ?? ''}
          open={openDetailsDialog}
          setOpen={setOpenDetailsDialog}
        />
      </div>
    </div>
  );
}
