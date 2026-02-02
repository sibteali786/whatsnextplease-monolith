'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Edit, Trash2, MoreHorizontal, Clock } from 'lucide-react';
import { getCurrentUser } from '@/utils/user';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { formatTimeFromMinutes } from '@/utils/time/timeUtils';
import { WorkLog } from '@/utils/time/worklogApiClient';

interface WorkLogItemProps {
  workLog: WorkLog;
  onEdit: (workLog: WorkLog) => void;
  onDelete: (workLogId: string) => void;
  deleting: boolean;
  verboseTime?: boolean;
}

export default function WorkLogItem({
  workLog,
  onEdit,
  onDelete,
  deleting,
  verboseTime = false,
}: WorkLogItemProps) {
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  // check permissions
  useEffect(() => {
    console.log('WorkLogItem mounted with workLog:', workLog);
    const checkPermissions = async () => {
      const currentUser = await getCurrentUser();
      console.log('Current User in WorkLogItem:', currentUser);
      if (!currentUser) return;

      // User can edit/delete their own work logs
      if (workLog.authorType === 'USER' && workLog.authorUser?.id === currentUser.id) {
        setCanEdit(true);
        setCanDelete(true);
      } else if (workLog.authorType === 'CLIENT' && workLog.authorClient?.id === currentUser.id) {
        setCanEdit(true);
        setCanDelete(true);
      }

      // Super users and supervisors can delete any work log
      // TODO: We can do something like that Super Visors can take permission from the user who added the worklog, or for now lets only allow super users to do so
      if (currentUser.role?.name === 'SUPER_USER') {
        setCanDelete(true);
      }
    };
    checkPermissions();
  }, [workLog]);

  const getAuthorName = () => {
    if (workLog.authorType === 'USER' && workLog.authorUser) {
      return `${workLog.authorUser.firstName || ''} ${workLog.authorUser.lastName || ''}`.trim();
    }

    if (workLog.authorType === 'CLIENT' && workLog.authorClient) {
      return `${workLog.authorClient.contactName || workLog.authorClient.companyName || 'Client'}`.trim();
    }

    return 'Unknown Author';
  };

  const getAuthorAvatar = () => {
    if (workLog.authorType === 'USER' && workLog.authorUser) {
      return workLog.authorUser.avatarUrl;
    }
    if (workLog.authorType === 'CLIENT' && workLog.authorClient) {
      return workLog.authorClient.avatarUrl;
    }
    return null;
  };

  const getAuthorInitials = () => {
    const name = getAuthorName();
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'PPp'); // e.g., "Jan 30, 2026, 2:19 PM"
  };

  return (
    <div className="flex gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      {/* Avatar */}
      <Avatar className="w-10 h-10 mt-1">
        <AvatarImage src={getAuthorAvatar() || undefined} />
        <AvatarFallback className="text-xs">{getAuthorInitials()}</AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{getAuthorName()}</span>
              <span className="text-xs text-muted-foreground">logged time</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formatDate(workLog.startedAt)}</span>
            </div>
          </div>

          {/* Actions */}
          {(canEdit || canDelete) && !deleting && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={() => onEdit(workLog)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(workLog.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {deleting && (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {/* Time Information */}
        <div className="flex items-center gap-4 flex-wrap">
          <Badge variant="secondary" className="font-mono">
            <Clock className="w-3 h-3 mr-1" />
            {formatTimeFromMinutes(workLog.timeSpent, verboseTime)} logged
          </Badge>
          {workLog.timeRemaining !== null && (
            <Badge variant="outline" className="font-mono">
              {formatTimeFromMinutes(workLog.timeRemaining, verboseTime)} remaining
            </Badge>
          )}
        </div>

        {/* Work Description */}
        <div
          className="prose prose-sm max-w-none break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
          dangerouslySetInnerHTML={{
            __html: workLog.description || '<p>No description</p>',
          }}
        />
      </div>
    </div>
  );
}
