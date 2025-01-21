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
import { NotificationStatus } from '@prisma/client';

interface NotificationsListProps {
  notifications: NotificationList[];
  markAsRead: (id: string) => Promise<void>;
  markingRead: string[];
  onMarkAllRead: () => void;
}

function formatDistance(date1: Date, date2: Date, options: { addSuffix: boolean }): string {
  return dateFnsFormatDistance(date1, date2, options);
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
          {/* Unread indicator */}
          {item.status === NotificationStatus.UNREAD && (
            <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
          )}

          {/* Avatar with improved sizing */}
          <div className="shrink-0">
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

          {/* Content with better structure */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-none mb-1">{item.message}</p>
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
                    item.status === NotificationStatus.READ ||
                    markingRead.includes(item.id)
                  }
                >
                  {markingRead.includes(item.id) ? (
                    <div className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Marking as read...
                    </div>
                  ) : (
                    <>
                      {item.status === NotificationStatus.READ
                        ? 'Already read'
                        : 'Mark as Read'}
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => console.log(`Delete Notification: ${item.id}`)}
                >
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
        <CardHeader>
          <CardTitle className="text-2xl">Notifications</CardTitle>
          <CardDescription className="text-muted-foreground">
            Stay updated on the latest changes
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="all">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
                <TabsTrigger value="unread">
                  Unread ({unreadNotifications.length})
                </TabsTrigger>
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

            <TabsContent value="all">
              {renderNotifications(notifications)}
            </TabsContent>
            
            <TabsContent value="unread">
              {renderNotifications(unreadNotifications)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
