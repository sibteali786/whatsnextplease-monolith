'use client';

import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AtSign, ExternalLink } from 'lucide-react';
import { NotificationList } from '@wnp/types';

interface MentionNotificationCardProps {
  notification: NotificationList;
  onNavigate: () => void;
}

export const MentionNotificationCard = ({
  notification,
  onNavigate,
}: MentionNotificationCardProps) => {
  const { details } = notification.data || {};
  const { taskTitle, commentPreview, mentionerName } = details || {};

  return (
    <Card className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AtSign className="h-5 w-5 text-blue-500" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
            You were mentioned
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={notification.data?.avatarUrl || undefined} />
            <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
              {mentionerName?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{mentionerName}</p>
            <p className="text-xs text-muted-foreground">in &quot;{taskTitle}&quot;</p>
          </div>
        </div>

        {commentPreview && (
          <div className="bg-white dark:bg-gray-800 rounded-md p-3 border">
            <p className="text-sm text-gray-700 dark:text-gray-300 italic">
              &quot;{commentPreview}&quot;
            </p>
          </div>
        )}

        <Button onClick={onNavigate} size="sm" className="w-full" variant="outline">
          <ExternalLink className="h-4 w-4 mr-2" />
          Go to Comment
        </Button>
      </div>
    </Card>
  );
};
