'use client';
import { State } from '@/components/DataState';
import { Button } from '@/components/ui/button';
import { Tabs, TabsTrigger } from '@/components/ui/tabs';
import { TabsContent, TabsList } from '@radix-ui/react-tabs';
import { CircleX, Loader2, Plus } from 'lucide-react';
import { DataTable } from './data-table';
import { columns } from './columns-skill-category';
import { ErrorResponse, SkillCategories, TaskCategories } from '@wnp/types';
import { useEffect, useState } from 'react';
import { COOKIE_NAME } from '@/utils/constant';
import { AddSkillCategoryDialog } from './AddSkillCategoryDialog';
import { getCookie } from '@/utils/utils';
import { columnsTaskCategories } from './columns-task-category';

export default function Picklists() {
  const [isError, setIsError] = useState(false);
  const [skillCategories, setSkillCategories] = useState<SkillCategories[] | ErrorResponse>([]);
  const [taskCategories, setTaskCategories] = useState<TaskCategories[] | ErrorResponse>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      const token = getCookie(COOKIE_NAME);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/skillCategory/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const skillCategories = await response.json();
      if ('code' in skillCategories) {
        setIsError(true);
      }
      setSkillCategories(skillCategories);
      setIsLoading(false);
    };
    const fetchTaskDetails = async () => {
      setIsLoading(true);
      const token = getCookie(COOKIE_NAME);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/taskCategory/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const taskCategories = await response.json();
      if ('code' in taskCategories) {
        setIsError(true);
      }
      setTaskCategories(taskCategories);
      setIsLoading(false);
    };
    fetchDetails();
    fetchTaskDetails();
  }, []);
  if (isError) {
    return (
      <div className="flex flex-col">
        <State
          icon={CircleX}
          variant={'destructive'}
          title="Skill Categories"
          description={'Failed to fetch skill categories, Try refreshing the page'}
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
                <Button className="gap-2" onClick={() => setOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Add Skill Category
                </Button>
              </div>
              {!isLoading ? (
                <DataTable data={skillCategories as SkillCategories[]} columns={columns} />
              ) : (
                <div className="flex items-center justify-center h-[50vh]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              <AddSkillCategoryDialog open={open} setOpen={setOpen} />
            </div>
          </TabsContent>
          <TabsContent value="tasks">
            <div className="mt-4 space-y-4 flex flex-col">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium">Task Categories</h2>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Task Category
                </Button>
              </div>
              {!isLoading ? (
                <DataTable
                  data={taskCategories as TaskCategories[]}
                  columns={columnsTaskCategories}
                />
              ) : (
                <div className="flex items-center justify-center h-[50vh]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
