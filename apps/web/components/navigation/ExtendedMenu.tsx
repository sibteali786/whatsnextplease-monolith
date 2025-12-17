'use client';

import { MoreVertical, ListChecks, MessageSquareText, Bell, Sun, Moon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';

interface MoreMenuProps {
  unreadNotifications?: number;
  unreadMessages?: number;
  isMessagesActive?: boolean;
  isTaskOfferingsActive?: boolean;
  onMessageClick?: () => void;
}

export function ExtendedMenu({
  unreadNotifications = 0,
  unreadMessages = 0,
  isMessagesActive = false,
  isTaskOfferingsActive = false,
  onMessageClick,
}: MoreMenuProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="More options"
        >
          <MoreVertical className="w-5 h-5" />
          {/* Notification indicator */}
          {(unreadNotifications > 0 || unreadMessages > 0) && (
            <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Task Management - Always visible in More menu */}
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => handleNavigation('/taskOfferings')}
        >
          <ListChecks className="w-4 h-4 mr-2" />
          <span>Task Management</span>
          {isTaskOfferingsActive && <div className="ml-auto w-2 h-2 bg-purple-600 rounded-full" />}
        </DropdownMenuItem>

        {/* Messages - Always visible in More menu */}
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => {
            handleNavigation('/messages');
            onMessageClick?.();
          }}
        >
          <MessageSquareText className="w-4 h-4 mr-2" />
          <span>Messages</span>
          <div className="ml-auto flex items-center gap-2">
            {unreadMessages > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 text-xs px-1.5">
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </Badge>
            )}
            {isMessagesActive && <div className="w-2 h-2 bg-purple-600 rounded-full" />}
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Theme Toggle - Always visible in More menu */}
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 mr-2" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 mr-2" />
              <span>Dark Mode</span>
            </>
          )}
        </DropdownMenuItem>

        {/* Notifications - Always visible in More menu */}
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => handleNavigation('/notifications')}
        >
          <Bell className="w-4 h-4 mr-2" />
          <span>Notifications</span>
          {unreadNotifications > 0 && (
            <Badge variant="destructive" className="ml-auto h-5 min-w-5 text-xs px-1.5">
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </Badge>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
