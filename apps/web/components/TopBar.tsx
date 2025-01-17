'use client';
import { ListChecks, MessageSquareText, Search } from 'lucide-react';
import { Input } from './ui/input';
import { ModeToggle } from '@/utils/modeToggle';
import { NavUser } from './common/NavUser';
import { getCurrentUser, UserState } from '@/utils/user';
import Link from 'next/link';
import { Button } from './ui/button';
import { ActiveVerticalMenu } from './common/ActiveVerticalMenu';
import { NotificationBell } from './notifications/NotificationBell';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';
import { Roles } from '@prisma/client';
import { useEffect, useState } from 'react';

const TopBarContent = ({ user }: { user: UserState }) => {
  const { unreadCount } = useNotifications();

  return (
    <header className="h-16 bg-white dark:bg-black border flex items-center px-4 sticky top-[24px] rounded-full left-[50%] z-10 ">
      <div className="flex-grow">
        <div className="relative ml-auto flex-1 md:grow-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground ml-2" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-full rounded-full bg-background pl-12 md:w-[200px] lg:w-[336px]"
          />
        </div>
      </div>
      <div className="flex flex-row gap-6 items-center justify-around">
        <div className="flex flex-col items-center">
          <ActiveVerticalMenu activePath="/taskOfferings" />
          <Link href="/taskOfferings">
            <Button variant="ghost">
              <ListChecks size={24} className="text-textPrimary" />
            </Button>
          </Link>
        </div>
        <Button variant={'ghost'}>
          <MessageSquareText size={24} className="text-textPrimary" />
        </Button>
        <ModeToggle />
        <div className="flex flex-col items-center">
          <NotificationBell userId={user.id} unreadCount={unreadCount} />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <NavUser user={user} />
        </div>
        <div className="w-10"></div>
      </div>
    </header>
  );
};

const TopBar = () => {
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
      <TopBarContent user={user} />
    </NotificationProvider>
  );
};

export default TopBar;