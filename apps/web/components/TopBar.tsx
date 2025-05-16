'use client';
import { ListChecks, MessageSquareText, Search } from 'lucide-react';
import { Input } from './ui/input';
import { ModeToggle } from '@/utils/modeToggle';
import { NavUser } from './common/NavUser';
import { getCurrentUser, UserState } from '@/utils/user';
import { Button } from './ui/button';
import { ActiveVerticalMenu } from './common/ActiveVerticalMenu';
import { NotificationBell } from './notifications/NotificationBell';
import { useNotifications } from '@/contexts/NotificationContext';
import { useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { LinkButton } from './ui/LinkButton';

const TopBar = () => {
  const [user, setUser] = useState<UserState | null>(null);
  const { unreadCount } = useNotifications();

  useEffect(() => {
    const fetchDependencies = async () => {
      const loggedInUser = await getCurrentUser();
      setUser(loggedInUser);
    };
    fetchDependencies();
  }, []);

  if (!user) return null;

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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <LinkButton href="/taskOfferings" prefetch={true} variant={'ghost'}>
                  <ListChecks size={24} className="text-textPrimary" />
                </LinkButton>
              </TooltipTrigger>
              <TooltipContent>
                <p>Task Management</p>
                <p className="text-xs text-muted-foreground mt-1">View and manage all tasks</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={'ghost'}>
                <MessageSquareText size={24} className="text-textPrimary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Messages</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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

export default TopBar;
