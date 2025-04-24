'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DynamicBreadcrumb } from '@/components/DynamicBreadcrumb';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getTaskAgentById, TaskAgent } from '@/utils/taskAgentApi';

export default function TaskAgentDetailPage({ params }: { params: { agentId: string } }) {
  const [taskAgent, setTaskAgent] = useState<TaskAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTaskAgent() {
      try {
        setLoading(true);
        const response = await getTaskAgentById(params.agentId);
        console.log('Response:', response);
        if (response.success && response.taskAgent) {
          setTaskAgent(response.taskAgent);
        } else {
          setError(response.message || 'Failed to fetch task agent details');
        }
      } catch (err) {
        setError('An unexpected error occurred');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchTaskAgent();
  }, [params.agentId]);

  // Construct name from firstName and lastName for breadcrumb and display
  const agentName = taskAgent ? `${taskAgent.firstName} ${taskAgent.lastName}` : 'Agent Details';

  const breadcrumbLinks = [
    { href: '/taskAgents', label: 'Task Agents' },
    { href: `/taskAgents/${params.agentId}`, label: agentName },
  ];

  if (loading) {
    return (
      <div className="container mx-auto py-4">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-4">
        <DynamicBreadcrumb links={breadcrumbLinks} />
        <div className="mt-4 p-6 bg-red-50 rounded-lg border border-red-200">
          <h2 className="text-lg font-semibold text-red-700">Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!taskAgent) {
    return (
      <div className="container mx-auto py-4">
        <DynamicBreadcrumb links={breadcrumbLinks} />
        <div className="mt-4 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
          <h2 className="text-lg font-semibold">Task Agent Not Found</h2>
          <p>The requested task agent could not be found.</p>
        </div>
      </div>
    );
  }

  // Determine agent status based on counts
  const isAvailable = taskAgent.assignedTasksCount === 0 && taskAgent.inProgressTasksCount === 0;

  return (
    <div className="container mx-auto py-4">
      <DynamicBreadcrumb links={breadcrumbLinks} />

      <div className="mt-6">
        <Card className="bg-purple-600 text-white">
          <CardHeader>
            <CardTitle className="text-2xl">{agentName}</CardTitle>
            <p className="text-purple-100">{taskAgent.designation || 'Task Agent'}</p>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Assigned Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-5xl font-bold text-center">
              {taskAgent.assignedTasksCount === 0
                ? '0'
                : taskAgent.assignedTasksCount < 10
                  ? `0${taskAgent.assignedTasksCount}`
                  : taskAgent.assignedTasksCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-5xl font-bold text-center text-yellow-500">
              {taskAgent.inProgressTasksCount === 0
                ? '0'
                : taskAgent.inProgressTasksCount < 10
                  ? `0${taskAgent.inProgressTasksCount}`
                  : taskAgent.inProgressTasksCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-5xl font-bold text-center text-green-500">
              {taskAgent.completedTasksCount === 0
                ? '0'
                : taskAgent.completedTasksCount < 10
                  ? `0${taskAgent.completedTasksCount}`
                  : taskAgent.completedTasksCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-5xl font-bold text-center text-red-500">
              {taskAgent.overdueTasksCount === 0
                ? '0'
                : taskAgent.overdueTasksCount < 10
                  ? `0${taskAgent.overdueTasksCount}`
                  : taskAgent.overdueTasksCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Badge className={isAvailable ? 'bg-green-500' : 'bg-blue-500'}>
                {isAvailable ? 'Available' : 'Working'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
