import { getCurrentUser, UserState } from '@/utils/user';
import { UserTasks } from './UserTasks';
import { Roles } from '@prisma/client';
import { useEffect, useState } from 'react';

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
      />
    </div>
  );
}
