import { getCurrentUser, UserState } from '@/utils/user';
import { UserTasks } from './UserTasks';
import { Roles } from '@prisma/client';
import { useEffect, useState } from 'react';
import { USER_CREATED_TASKS_CONTEXT } from '@/utils/commonUtils/taskPermissions';

export default function UserTaskList({
  userId,
  onTaskUpdate,
}: {
  userId: string;
  showDescription?: boolean;
  onTaskUpdate?: () => Promise<void>;
}) {
  const [user, setUser] = useState<UserState | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <UserTasks
        role={user?.role?.name ?? Roles.SUPER_USER}
        userId={userId}
        onTaskUpdate={onTaskUpdate}
        context={USER_CREATED_TASKS_CONTEXT.USER_PROFILE}
      />
    </div>
  );
}
