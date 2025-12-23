'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { Roles } from '@prisma/client';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SideBarContext';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export function ShellContent({ children, role }: { children: ReactNode; role: Roles }) {
  const { isCollapsed, isMobile, isSheetOpen, setSheetOpen } = useSidebar();

  return (
    <div className="flex w-screen h-screen">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside
          className={cn(
            'h-full border-default-50 transition-all duration-300',
            isCollapsed ? 'w-20 min-w-20 max-w-20' : 'max-w-[280px]'
          )}
        >
          <Sidebar role={role} />
        </aside>
      )}

      {/* Mobile Sheet */}
      {isMobile && (
        <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="left" className="w-[280px] p-0">
            <Sidebar role={role} />
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content Area */}
      <div
        className={cn(
          'overflow-auto dark:bg-background bg-backgroundPrimary transition-all duration-300',
          isMobile
            ? 'w-full px-4'
            : isCollapsed
              ? 'w-[calc(100vw-80px)] px-10'
              : 'w-[calc(100vw-280px)] px-10'
        )}
      >
        <TopBar />
        <main className="mt-16 h-full">{children}</main>
      </div>
    </div>
  );
}
