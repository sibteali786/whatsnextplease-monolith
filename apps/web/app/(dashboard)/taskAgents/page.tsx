'use client';

import { useEffect, useState } from 'react';
import Search from '@/components/Search';
import { getTaskAgentIds, getTaskAgents, TaskAgent } from '@/utils/taskAgentApi';
import { TaskAgentTable } from './task-agent-table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function TaskAgentsPage() {
  const [status, setStatus] = useState<string>('all');
  const [agentIds, setAgentIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const fetchAgentIds = async () => {
      const ids = await getTaskAgentIds();
      setAgentIds(ids);
    };
    fetchAgentIds();
  }, []);

  const fetchData = async (
    cursor: string | null,
    pageSize: number
  ): Promise<{
    taskAgents: TaskAgent[];
    nextCursor?: string | null;
    totalCount: number;
  }> => {
    try {
      // Pass status and searchTerm to API
      const response = await getTaskAgents(cursor, pageSize, status, searchTerm);
      if (response.success) {
        return {
          taskAgents: response.taskAgents,
          nextCursor: response.nextCursor,
          totalCount: response.totalCount,
        };
      } else {
        console.error('Error fetching task agents:', response);
        return { taskAgents: [], totalCount: 0 };
      }
    } catch (error) {
      console.error('Failed to fetch task agents:', error);
      return { taskAgents: [], totalCount: 0 };
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  return (
    <div className="container mx-auto py-4">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold">Task Agents</h1>
          <Search placeholder="Search Task Agent" onSearch={handleSearch} />
        </div>

        <Tabs defaultValue="all" className="w-full" onValueChange={setStatus}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="available">Available</TabsTrigger>
            <TabsTrigger value="working">Working</TabsTrigger>
          </TabsList>
        </Tabs>

        <TaskAgentTable
          fetchData={fetchData}
          agentIds={agentIds}
          status={status}
          searchTerm={searchTerm}
        />
      </div>
    </div>
  );
}
