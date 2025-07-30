import { DynamicTabs, Tab } from '@/components/clients/ClientTabs';
import { DetailsCard } from '@/components/common/DetailsCard';
import UserFileList from '@/components/users/UserFileList';
import UserSkillsList from '@/components/users/UserSkillsList';
import UserTaskList from '@/components/users/UserTaskList';
import { getUserById } from '@/utils/userTools';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getTaskAgentStatsById } from '@/utils/taskAgentActions';

const UserProfile = async ({ params }: { params: { userId: string } }) => {
  const { user, message } = await getUserById(params.userId);

  // Fetch task agent stats
  let taskStats = null;
  let isAvailable = false;

  // Only fetch task agent statistics if the user exists
  if (user) {
    const taskAgentResponse = await getTaskAgentStatsById(params.userId);
    if (taskAgentResponse.success && taskAgentResponse.taskAgent) {
      taskStats = taskAgentResponse.taskAgent;
      isAvailable = taskStats.assignedTasksCount === 0 && taskStats.inProgressTasksCount === 0;
    }
  }

  const userTabs: Tab[] = [
    {
      tabName: 'Tasks',
      tabValue: 'tasks',
      tabContent: <UserTaskList userId={params.userId} />,
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
        <p className="text-red-500">Error: {message}</p>
      )}

      {/* Task Statistics Cards - Show for Task Agents and Task Supervisors */}
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
