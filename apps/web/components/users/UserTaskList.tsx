import { getCurrentUser } from '@/utils/user';
import { UserTasks } from './UserTasks';
import { Roles } from '@prisma/client';

export default async function UserTaskList({
  userId,
}: {
  userId: string;
  showDescription?: boolean;
}) {
  const user = await getCurrentUser();
  return (
    <div>
      <UserTasks role={user?.role?.name ?? Roles.SUPER_USER} userId={userId} />
    </div>
  );
}
