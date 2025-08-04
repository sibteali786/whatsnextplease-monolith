/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { DynamicTabs, Tab } from '@/components/clients/ClientTabs';
import { DetailsCard } from '@/components/common/DetailsCard';
import UserFileList from '@/components/users/UserFileList';
import UserSkillsList from '@/components/users/UserSkillsList';
import UserTaskList from '@/components/users/UserTaskList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchUserData, fetchTaskStats } from '@/actions/userActions'; // Import the skeleton
import { UserProfileSkeleton } from '@/components/common/LoadingStates';

const UserProfile = ({ params }: { params: { userId: string } }) => {
  const [user, setUser] = useState<any>(null);
  const [taskStats, setTaskStats] = useState<any>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to refresh task statistics
  const refreshTaskStats = async () => {
    try {
      const { taskStats: stats, success } = await fetchTaskStats(params.userId);
      if (success && stats) {
        setTaskStats(stats);
        setIsAvailable(stats.newTasksCount === 0 && stats.inProgressTasksCount === 0);
      }
    } catch (error) {
      console.error('Error refreshing task stats:', error);
    }
  };

  // Initial data fetch
  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { user: userData, success, message } = await fetchUserData(params.userId);
        if (success && userData) {
          setUser(userData);
          await refreshTaskStats();
        } else {
          setError(message || 'Failed to load user data');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setError('An unexpected error occurred while loading user data');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [params.userId]);

  const userTabs: Tab[] = [
    {
      tabName: 'Tasks',
      tabValue: 'tasks',
      tabContent: <UserTaskList userId={params.userId} onTaskUpdate={refreshTaskStats} />,
    },
    {
      tabName: 'Schedule',
      tabValue: 'schedule',
      tabContent: <div>Schedule</div>,
    },
    {
      tabName: 'Skills',
      tabValue: 'skills',
      tabContent: <UserSkillsList userId={params.userId} />,
    },
    {
      tabName: 'Files',
      tabValue: 'files',
      tabContent: <UserFileList userId={params.userId} />,
    },
  ];

  // Show skeleton loading
  if (loading) {
    return <UserProfileSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Error Loading User</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      {user ? (
        <DetailsCard
          title={`${user.firstName} ${user.lastName}`}
          subTitle={user.designation || ''}
          avatarUrl={user.avatarUrl}
          leftFields={[
            { label: 'Phone', value: user.phone },
            { label: 'Email', value: user.email },
            { label: 'City', value: user.city },
            { label: 'State', value: user.state },
            { label: 'Zip Code', value: user.zipCode },
          ]}
          rightFields={[{ label: 'Address 1', value: user.address }]}
        />
      ) : (
        <p className="text-red-500">Error loading user data</p>
      )}

      {/* Task Statistics Cards */}
      {taskStats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-blue-500 text-white">
              <CardHeader>
                <CardTitle className="text-xl text-center">New</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-5xl font-bold text-center">
                  {taskStats.newTasksCount === 0
                    ? '0'
                    : taskStats.newTasksCount < 10
                      ? `0${taskStats.newTasksCount}`
                      : taskStats.newTasksCount}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-warning text-white">
              <CardHeader>
                <CardTitle className="text-xl text-center">In Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-5xl font-bold text-center">
                  {taskStats.inProgressTasksCount === 0
                    ? '0'
                    : taskStats.inProgressTasksCount < 10
                      ? `0${taskStats.inProgressTasksCount}`
                      : taskStats.inProgressTasksCount}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-success text-white">
              <CardHeader>
                <CardTitle className="text-xl text-center">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-5xl font-bold text-center">
                  {taskStats.completedTasksCount === 0
                    ? '0'
                    : taskStats.completedTasksCount < 10
                      ? `0${taskStats.completedTasksCount}`
                      : taskStats.completedTasksCount}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-destructive text-white">
              <CardHeader>
                <CardTitle className="text-xl text-center">Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-5xl font-bold text-center">
                  {taskStats.overdueTasksCount === 0
                    ? '0'
                    : taskStats.overdueTasksCount < 10
                      ? `0${taskStats.overdueTasksCount}`
                      : taskStats.overdueTasksCount}
                </p>
              </CardContent>
            </Card>
          </div>

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
        </>
      )}

      <DynamicTabs tabs={userTabs} defaultValue="tasks" />
    </div>
  );
};

export default UserProfile;
