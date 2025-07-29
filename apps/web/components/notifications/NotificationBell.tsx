import { Bell } from 'lucide-react';
import { ActiveVerticalMenu } from '../common/ActiveVerticalMenu';
import { LinkButton } from '../ui/LinkButton';

interface NotificationBellProps {
  unreadCount: number;
}

export const NotificationBell = ({ unreadCount }: NotificationBellProps) => {
  return (
    <div className="flex flex-col items-center">
      <ActiveVerticalMenu activePath="/notifications" />
      <LinkButton href={`/notifications/me`} prefetch={true} variant={'ghost'}>
        <div className="relative">
          <Bell size={24} className="text-textPrimary" />
          {unreadCount > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] border-2 border-background">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </div>
      </LinkButton>
    </div>
  );
};
