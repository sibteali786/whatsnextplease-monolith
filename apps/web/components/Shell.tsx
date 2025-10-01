import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { getCurrentUser } from '@/utils/user';
import { Roles } from '@prisma/client';

const Shell = async ({ children }: { children: ReactNode }) => {
  const user = await getCurrentUser();
  return (
    <div className="flex w-screen h-screen">
      <aside className="w-[280px] min-w-[280px] max-w-[280px] h-full border-r border-default-50">
        <Sidebar role={user?.role?.name ?? Roles.SUPER_USER} />
      </aside>
      <div className="w-[calc(100vw-280px)] px-10 overflow-auto dark:bg-background bg-backgroundPrimary">
        <TopBar />
        <main className="mt-16 h-full">{children}</main>
      </div>
    </div>
  );
};

export default Shell;
