'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { Roles } from '@prisma/client';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SideBarContext';

export function ShellContent({ children, role }: { children: ReactNode; role: Roles }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex w-screen h-screen">
      <aside
        className={cn(
          'h-full border-r border-default-50 transition-all duration-300',
          isCollapsed ? 'w-20 min-w-20 max-w-20' : 'w-[280px] min-w-[280px] max-w-[280px]'
        )}
      >
        <Sidebar role={role} />
      </aside>
      <div
        className={cn(
          'px-10 overflow-auto dark:bg-background bg-backgroundPrimary transition-all duration-300',
          isCollapsed ? 'w-[calc(100vw-80px)]' : 'w-[calc(100vw-280px)]'
        )}
      >
        <TopBar />
        <main className="mt-16 h-full">{children}</main>
      </div>
    </div>
  );
}
