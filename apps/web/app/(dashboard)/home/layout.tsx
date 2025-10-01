'use client';

import ProfileBanner from '@/components/settings/ProfileBanner';
import { getCurrentUser, UserState } from '@/utils/user';
import { Roles } from '@prisma/client';
import { useEffect, useState } from 'react';

export default function DashboardLayout({
  superUser,
  taskAgent,
  client,
  taskSupervisor,
}: {
  superUser: React.ReactNode;
  taskAgent: React.ReactNode;
  client: React.ReactNode;
  taskSupervisor: React.ReactNode;
}) {
  const [user, setUser] = useState<UserState | null>(null);
  useEffect(() => {
    const fetchDependencies = async () => {
      const loggedInUser = await getCurrentUser();
      setUser(loggedInUser);
    };
    fetchDependencies();
  }, []);
  const showBanner =
    user?.role?.name === Roles.CLIENT
      ? !user?.avatarUrl || !user?.bio
      : !user?.avatarUrl || !user?.bio || !user?.userSkills || user?.userSkills.length === 0;

  return (
    <div>
      {user && showBanner && <ProfileBanner user={user} />}
      <div>{user?.role?.name === Roles.TASK_SUPERVISOR ? taskSupervisor : null}</div>
      <div>{user?.role?.name === Roles.SUPER_USER ? superUser : null}</div>
      <div>{user?.role?.name === Roles.TASK_AGENT ? taskAgent : null}</div>
      <div>{user?.role?.name === Roles.CLIENT ? client : null}</div>
    </div>
  );
}
