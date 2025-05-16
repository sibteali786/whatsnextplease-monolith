import { Bell } from 'lucide-react';
import { Circle } from 'lucide-react';
import { ActiveVerticalMenu } from '../common/ActiveVerticalMenu';
import { LinkButton } from '../ui/LinkButton';

interface NotificationBellProps {
  userId: string;
  unreadCount: number;
}

export const NotificationBell = ({ userId, unreadCount }: NotificationBellProps) => {
  return (
    <div className="flex flex-col items-center">
      <ActiveVerticalMenu activePath="/notifications" />
      <LinkButton href={`/notifications/${userId}`} prefetch={true} variant={'ghost'}>
        <div className="relative">
          {unreadCount > 0 && (
            <Circle className="h-[10px] w-[10px] text-red-500 fill-red-500 top-[1px] right-[2px] absolute" />
          )}
          <Bell size={24} className="text-textPrimary" />
        </div>
      </LinkButton>
    </div>
  );
};
