import { TaskSuperVisorList } from '@/components/tasks/TaskSuperVisorList';
import { UserTasks } from '@/components/users/UserTasks';
import { DurationEnum, DurationEnumList } from '@/types';
import { USER_CREATED_TASKS_CONTEXT } from '@/utils/commonUtils/taskPermissions';
import { getCurrentUser } from '@/utils/user';
import { transformEnumValue } from '@/utils/utils';
import { Roles } from '@prisma/client';

export default async function TasksPage() {
  const user = await getCurrentUser();

  // Convert DurationEnum into a list of filter objects
  const listToFilterUpon: DurationEnumList = Object.values(DurationEnum).map(duration => ({
    label: duration,
    value: transformEnumValue(duration),
  }));
  if (user?.role?.name === Roles.CLIENT || user?.role?.name === Roles.TASK_AGENT) {
    return (
      <div className="flex flex-col gap-6">
        <UserTasks
          role={user?.role?.name ?? Roles.SUPER_USER}
          userId={user.id}
          listOfFilter={listToFilterUpon}
          context={USER_CREATED_TASKS_CONTEXT.GENERAL}
        />
      </div>
    );
  }

  return (
    <TaskSuperVisorList
      role={user?.role?.name ?? Roles.SUPER_USER}
      userId={user.id}
      listOfFilter={listToFilterUpon}
    />
  );
}
