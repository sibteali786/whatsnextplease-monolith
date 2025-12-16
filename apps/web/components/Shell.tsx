import { ReactNode } from 'react';
import { getCurrentUser } from '@/utils/user';
import { Roles } from '@prisma/client';
import { SidebarProvider } from '@/contexts/SideBarContext';
import { ShellContent } from './ShellContent';

const Shell = async ({ children }: { children: ReactNode }) => {
  const user = await getCurrentUser();

  return (
    <SidebarProvider>
      <ShellContent role={user?.role?.name ?? Roles.SUPER_USER}>{children}</ShellContent>
    </SidebarProvider>
  );
};

export default Shell;
