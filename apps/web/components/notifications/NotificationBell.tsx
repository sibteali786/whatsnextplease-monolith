import { Bell } from 'lucide-react';
import { Button } from '../ui/button';
import Link from 'next/link';
import { Circle } from 'lucide-react';
import { ActiveVerticalMenu } from '../common/ActiveVerticalMenu';

interface NotificationBellProps {
  userId: string;
  unreadCount: number;
}

export const NotificationBell = ({ userId, unreadCount }: NotificationBellProps) => {
  console.log('NotificationBell: Rendering with unreadCount:', unreadCount);

  return (
    <div className="flex flex-col items-center">
      <ActiveVerticalMenu activePath="/notifications" />
      <Link href={`/notifications/${userId}`}>
        <Button variant={'ghost'}>
          <div className="relative">
            {unreadCount > 0 && (
              <Circle className="h-[10px] w-[10px] text-red-500 fill-red-500 top-[1px] right-[2px] absolute" />
            )}
            <Bell size={24} className="text-textPrimary" />
          </div>
        </Button>
      </Link>
    </div>
  );
};
