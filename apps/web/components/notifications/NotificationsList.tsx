'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { NotificationList } from '@wnp/types';
import { formatDistance as dateFnsFormatDistance } from 'date-fns';
import { MoreHorizontal, Loader2, ArrowRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  NotificationStatus,
  TaskPriorityEnum,
  TaskStatusEnum,
  NotificationType,
} from '@prisma/client';
import { ConnectionStatusIndicator } from './NotificatonIndicator';
import { taskPriorityColors, taskStatusColors } from '@/utils/commonClasses';

interface NotificationsListProps {
  notifications: NotificationList[];
  markAsRead: (id: string) => Promise<void>;
  markingRead: string[];
  onMarkAllRead: () => void;
}

function formatDistance(date1: Date, date2: Date, options: { addSuffix: boolean }): string {
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      return 'just now';
    }

    const diffInMs = Math.abs(d2.getTime() - d1.getTime());
    if (diffInMs < 10000) {
      return 'just now';
    }

    return dateFnsFormatDistance(d1, d2, options);
  } catch (error) {
    console.warn('Error formatting date distance:', error);
    return 'just now';
  }
}

// Helper function to get badge styling based on field type and value
const getBadgeStyle = (field: string, value: string) => {
  // if alue is not in Enum form then we transform it to ENUm form like In Progress to IN_PROGRESS
  if (!Object.values(TaskStatusEnum).includes(value as TaskStatusEnum)) {
    value = value.toUpperCase().replace(/ /g, '_');
  }
  if (!Object.values(TaskPriorityEnum).includes(value as TaskPriorityEnum)) {
    value = value.toUpperCase().replace(/ /g, '_');
  }
  switch (field) {
    case 'status':
      return taskStatusColors[value as TaskStatusEnum] || 'bg-gray-500 text-white';
    case 'priority':
      return taskPriorityColors[value as TaskPriorityEnum] || 'bg-gray-500 text-white';
    case 'taskCategory':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Helper function to format field names for display
const formatFieldName = (field: string) => {
  switch (field) {
    case 'taskCategory':
      return 'Category';
    case 'priority':
      return 'Priority';
    case 'status':
      return 'Status';
    default:
      return field.charAt(0).toUpperCase() + field.slice(1);
  }
};

// Component to render task update notification content
const TaskUpdateContent = ({ notification }: { notification: NotificationList }) => {
  const { details } = notification.data || {};

  // Handle TASK_CREATED and TASK_ASSIGNED notifications
  if (
    notification.type === NotificationType.TASK_CREATED ||
    notification.type === NotificationType.TASK_ASSIGNED
  ) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium leading-none">{notification.message}</p>
        {details && (
          <div className="flex items-center gap-2 flex-wrap">
            {details.priority && (
              <Badge className={getBadgeStyle('priority', details.priority)}>
                {details.priority}
              </Badge>
            )}
            {details.status && (
              <Badge className={getBadgeStyle('status', details.status)}>{details.status}</Badge>
            )}
            {details.category && (
              <Badge className="bg-blue-100 text-blue-800 text-xs">{details.category}</Badge>
            )}
          </div>
        )}
      </div>
    );
  }

  // Handle TASK_MODIFIED notifications with old → new visualization
  if (!details || notification.type !== NotificationType.TASK_MODIFIED) {
    return (
      <div className="flex items-center gap-2 mb-1">
        <p className="text-sm font-medium leading-none">{notification.message}</p>
        {notification.data?.details?.priority && (
          <Badge className={getBadgeStyle('priority', notification.data.details.priority)}>
            {notification.data.details.priority.replace('_', ' ')}
          </Badge>
        )}
      </div>
    );
  }

  const { field, oldValue, newValue } = details;

  // Extract task name and user name from the message for TASK_MODIFIED
  const extractTaskAndUser = (message: string) => {
    const taskMatch = message.match(/Task "([^"]+)"/);
    const userMatch = message.match(/was updated by ([^:]+):/);

    return {
      taskName: taskMatch ? taskMatch[1] : 'Unknown',
      userName: userMatch && userMatch[1] ? userMatch[1].trim() : 'Unknown User',
    };
  };

  const { taskName, userName } = extractTaskAndUser(notification.message);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium leading-none">
        Task <span className="font-semibold text-purple-300">{taskName}</span> was updated by{' '}
        {userName}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">{formatFieldName(field)}:</span>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`text-xs ${getBadgeStyle(field, oldValue)} opacity-70`}
          >
            {oldValue}
          </Badge>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <Badge className={`text-xs ${getBadgeStyle(field, newValue)}`}>{newValue}</Badge>
        </div>
      </div>
    </div>
  );
};

export default function NotificationsList({
  notifications,
  markAsRead,
  markingRead,
  onMarkAllRead: markAllAsRead,
}: NotificationsListProps) {
  const unreadNotifications = notifications.filter(
    item => item.status === NotificationStatus.UNREAD
  );

  const renderNotifications = (items: NotificationList[]) => (
    <ScrollArea className="h-[450px] pr-5">
      {items.map(item => (
        <div
          key={item.id}
          className="group flex items-start gap-4 py-4 px-6 mb-2 rounded-lg transition-all duration-200 hover:bg-muted/50 relative"
        >
          {/* Priority indicator bar (left side) */}
          {item.data?.details?.priority && (
            <div
              className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${
                getBadgeStyle('priority', item.data.details.priority).split(' ')[0] || 'bg-gray-400'
              }`}
            />
          )}

          {/* Unread indicator */}
          {item.status === NotificationStatus.UNREAD && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
          )}

          {/* Avatar */}
          <div className="shrink-0 mt-1">
            <div
              className={`p-0.5 rounded-full ${
                item.data?.details?.priority
                  ? getBadgeStyle('priority', item.data.details.priority).split(' ')[0] ||
                    'bg-gray-400'
                  : 'bg-transparent'
              }`}
            >
              <Avatar className="h-10 w-10">
                {item.data?.avatarUrl ? (
                  <AvatarImage
                    src={item.data.avatarUrl}
                    alt={item.data?.name || 'User'}
                    className="object-cover"
                  />
                ) : (
                  <AvatarFallback className="bg-primary-foreground text-primary">
                    {item.data?.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                )}
              </Avatar>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <TaskUpdateContent notification={item} />
            <p className="text-xs text-muted-foreground mt-2">
              {formatDistance(new Date(item.createdAt), new Date(), {
                addSuffix: true,
              })}
            </p>
          </div>

          {/* Action buttons */}
          <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                {/* Add navigation to task if taskId exists */}
                {item.data?.taskId && (
                  <>
                    <DropdownMenuItem
                      onClick={() => window.open(`/taskOfferings/${item.data.taskId}`, '_blank')}
                    >
                      View Task
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(item.id)}>
                  Copy ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => markAsRead(item.id)}
                  disabled={
                    item.status === NotificationStatus.READ || markingRead.includes(item.id)
                  }
                >
                  {markingRead.includes(item.id) ? (
                    <div className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Marking as read...
                    </div>
                  ) : (
                    <>{item.status === NotificationStatus.READ ? 'Already read' : 'Mark as Read'}</>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => console.log(`Delete Notification: ${item.id}`)}>
                  Delete Notification
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </ScrollArea>
  );

  return (
    <div className="p-4">
      <Card className="shadow">
        <CardHeader className="flex flex-row justify-between">
          <div className="flex flex-col justify-start">
            <CardTitle className="text-2xl">Notifications</CardTitle>
            <CardDescription className="text-muted-foreground">
              Stay updated on the latest changes
            </CardDescription>
          </div>
          <ConnectionStatusIndicator />
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="all">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
                <TabsTrigger value="unread">Unread ({unreadNotifications.length})</TabsTrigger>
              </TabsList>
              <div className="space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={unreadNotifications.length === 0}
                >
                  Mark all as read
                </Button>
              </div>
            </div>

            <Separator />

            <TabsContent value="all">{renderNotifications(notifications)}</TabsContent>

            <TabsContent value="unread">{renderNotifications(unreadNotifications)}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
