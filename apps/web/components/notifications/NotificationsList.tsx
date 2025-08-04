'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { NotificationList } from '@wnp/types';
import { formatDistance as dateFnsFormatDistance } from 'date-fns';
import { MoreHorizontal, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { NotificationStatus, TaskPriorityEnum } from '@prisma/client';
import { ConnectionStatusIndicator } from './NotificatonIndicator';
import { taskPriorityColors } from '@/utils/commonClasses';

interface NotificationsListProps {
  notifications: NotificationList[];
  markAsRead: (id: string) => Promise<void>;
  markingRead: string[];
  onMarkAllRead: () => void;
}

function formatDistance(date1: Date, date2: Date, options: { addSuffix: boolean }): string {
  try {
    // Ensure both dates are valid Date objects
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    // Check if dates are valid
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      return 'just now';
    }

    // Calculate the difference in milliseconds
    const diffInMs = Math.abs(d2.getTime() - d1.getTime());

    // If the difference is less than 10 seconds, show "just now"
    if (diffInMs < 10000) {
      return 'just now';
    }

    return dateFnsFormatDistance(d1, d2, options);
  } catch (error) {
    console.warn('Error formatting date distance:', error);
    return 'just now';
  }
}

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
          className="group flex items-center gap-4 py-4 px-6 mb-2 rounded-lg transition-all duration-200 hover:bg-muted/50 relative"
        >
          {/* Priority indicator bar (left side) */}
          {item.data?.details?.priority && (
            <div
              className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${
                taskPriorityColors[item.data.details.priority as TaskPriorityEnum]?.split(' ')[0] ||
                'bg-gray-400'
              }`}
            />
          )}
          {/* Unread indicator - moved slightly to the right */}
          {item.status === NotificationStatus.UNREAD && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
          )}

          {/* Avatar with priority border */}
          <div className="shrink-0">
            <div
              className={`p-0.5 rounded-full ${
                item.data?.details?.priority
                  ? taskPriorityColors[item.data.details.priority as TaskPriorityEnum]?.split(
                      ' '
                    )[0] || 'bg-gray-400'
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

          {/* Content with priority badge */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium leading-none">{item.message}</p>
              {item.data?.details?.priority && (
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    taskPriorityColors[item.data.details.priority as TaskPriorityEnum] ||
                    'bg-gray-500 text-white'
                  }`}
                >
                  {item.data.details.priority.replace('_', ' ')}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDistance(new Date(item.createdAt), new Date(), {
                addSuffix: true,
              })}
            </p>
          </div>

          {/* Action buttons */}
          <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
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
