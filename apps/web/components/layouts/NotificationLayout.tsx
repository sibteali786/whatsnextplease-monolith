'use client';

import { NotificationProvider } from '@/contexts/NotificationContext';
import { getCurrentUser, UserState } from '@/utils/user';
import { Roles } from '@prisma/client';
import { useEffect, useState } from 'react';

export default function NotificationLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserState | null>(null);

  useEffect(() => {
    const fetchDependencies = async () => {
      const loggedInUser = await getCurrentUser();
      setUser(loggedInUser);
    };
    fetchDependencies();
  }, []);

  if (!user) return null;

  return (
    <NotificationProvider userId={user.id} role={user.role.name ?? Roles.TASK_AGENT}>
      {children}
    </NotificationProvider>
  );
}
