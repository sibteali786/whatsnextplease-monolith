/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { ListChecks, MessageSquareText, Search } from 'lucide-react';
import { Input } from './ui/input';
import { ModeToggle } from '@/utils/modeToggle';
import { NavUser } from './common/NavUser';
import { getCurrentUser, UserState } from '@/utils/user';
import { ActiveVerticalMenu } from './common/ActiveVerticalMenu';
import { NotificationBell } from './notifications/NotificationBell';
import { useNotifications } from '@/contexts/NotificationContext';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { LinkButton } from './ui/LinkButton';
import { usePathname } from 'next/navigation';
import { Badge } from './ui/badge';
import { ChatMessageType, ParentChatInfoTypes } from '@/utils/chat/constants';

interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: number;
}

const TopBar = () => {
  const [user, setUser] = useState<UserState | null>(null);
  const { unreadCount } = useNotifications();
  const pathname = usePathname();

  // Chat notification states
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [lastMessage, setLastMessage] = useState<ChatMessage | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Use refs to store stable values and prevent recreating functions
  const stateRef = useRef({
    hasNewMessages: false,
    messageCount: 0,
    lastMessage: null as ChatMessage | null,
    isConnected: false,
  });

  const configRef = useRef({
    chatAppOrigin: process.env.NEXT_PUBLIC_CHAT_APP_URL || 'http://localhost:3000/',
    parentAppId: 'wnp-app',
  });

  const isInitializedRef = useRef(false);
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);

  useEffect(() => {
    const fetchDependencies = async () => {
      const loggedInUser = await getCurrentUser();
      setUser(loggedInUser);
    };
    fetchDependencies();
  }, []);

  // Update refs when state changes
  useEffect(() => {
    stateRef.current = {
      hasNewMessages,
      messageCount,
      lastMessage,
      isConnected,
    };
  }, [hasNewMessages, messageCount, lastMessage, isConnected]);

  // Stable function to send messages to chat iframe
  const sendToChat = useCallback((type: string, payload?: any) => {
    const chatIframe = document.querySelector('iframe[title="Team Chat"]') as HTMLIFrameElement;
    if (chatIframe && chatIframe.contentWindow) {
      chatIframe.contentWindow.postMessage(
        {
          source: configRef.current.parentAppId,
          type,
          payload,
        },
        configRef.current.chatAppOrigin
      );
    }
  }, []); // No dependencies - uses refs for dynamic values

  // Stable message handler that doesn't recreate on every render
  const createMessageHandler = useCallback(() => {
    return (event: MessageEvent) => {
      const { chatAppOrigin } = configRef.current;

      const allowedOrigins = [
        chatAppOrigin,
        'http://localhost:3001',
        'http://localhost:3000',
        window.location.origin,
      ];

      if (
        process.env.NODE_ENV === 'production' &&
        !allowedOrigins.some(origin =>
          event.origin.includes(origin.replace('https://', '').replace('http://', ''))
        )
      ) {
        console.warn('Ignore messages from unauthorized origin:', event.origin);
        return;
      }

      if (event.data?.source === 'chat-app') {
        console.log('Received chat notifications:', event.data);

        switch (event.data.type) {
          case ChatMessageType.Enum.CHAT_READY:
            setIsConnected(true);
            console.log('Chat app is ready and connected');
            sendToChat(ParentChatInfoTypes.Enum.PARENT_APP_INFO, {
              appId: configRef.current.parentAppId,
              timestamp: Date.now(),
            });
            break;

          case ChatMessageType.Enum.NEW_MESSAGE:
            const messageData = event.data.payload;
            setLastMessage({
              id: messageData.messageId || Date.now().toString(),
              content: messageData.preview || 'New message',
              sender: messageData.sender || 'Unknown',
              timestamp: messageData.timestamp || Date.now(),
            });
            setMessageCount(messageData.unreadCount || 1);
            setHasNewMessages(true);

            // Show browser notification if page is hidden
            if (
              document.hidden &&
              'Notification' in window &&
              Notification.permission === 'granted'
            ) {
              new Notification('New Chat Message', {
                body: `${messageData.sender}: ${messageData.preview}`,
                icon: '/logo.png',
                tag: 'chat-message',
              });
            }
            break;

          case 'MESSAGE_COUNT_UPDATE':
            const count = event.data.payload?.count || 0;
            setMessageCount(count);
            setHasNewMessages(count > 0);
            break;

          case 'MESSAGES_READ':
            setHasNewMessages(false);
            setMessageCount(0);
            break;

          case 'CHAT_DISCONNECTED':
            setIsConnected(false);
            break;

          default:
            console.log('Unknown chat message type:', event.data.type);
        }
      }
    };
  }, [sendToChat]); // Only depends on sendToChat which is stable

  // Initialize message listener ONCE
  useEffect(() => {
    if (isInitializedRef.current || messageHandlerRef.current) {
      return;
    }

    // Create the handler once and store it
    const messageHandler = createMessageHandler();
    messageHandlerRef.current = messageHandler;
    isInitializedRef.current = true;

    // Add event listener
    window.addEventListener('message', messageHandler);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    console.log('Chat notification listener initialized');

    return () => {
      window.removeEventListener('message', messageHandler);
      messageHandlerRef.current = null;
      isInitializedRef.current = false;
      console.log('Chat notification listener cleaned up');
    };
  }, []); // Empty dependency array - only run once

  // Handle chat open action
  const handleChatOpen = useCallback(() => {
    setHasNewMessages(false);
    setMessageCount(0);
    sendToChat(ParentChatInfoTypes.Enum.MARK_AS_READ, {
      timestamp: Date.now(),
    });
  }, [sendToChat]);

  if (!user) return null;

  // Check if current path is messages
  const isMessagesActive = pathname === '/messages';
  const isTaskOfferingsActive = pathname === '/taskOfferings';

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
        {/* Task Management */}
        <div className="flex flex-col items-center">
          <ActiveVerticalMenu activePath="/taskOfferings" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <LinkButton
                  href="/taskOfferings"
                  prefetch={true}
                  variant={isTaskOfferingsActive ? 'default' : 'ghost'}
                >
                  <ListChecks
                    size={24}
                    className={
                      isTaskOfferingsActive ? 'text-primary-foreground' : 'text-textPrimary'
                    }
                  />
                </LinkButton>
              </TooltipTrigger>
              <TooltipContent>
                <p>Task Management</p>
                <p className="text-xs text-muted-foreground mt-1">View and manage all tasks</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Messages with Chat Notification Features */}
        <div className="flex flex-col items-center">
          <ActiveVerticalMenu activePath="/messages" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <LinkButton
                  href="/messages"
                  prefetch={true}
                  variant={isMessagesActive ? 'default' : 'ghost'}
                  className="relative"
                  onClick={handleChatOpen}
                >
                  <MessageSquareText
                    size={24}
                    className={isMessagesActive ? 'text-primary-foreground' : 'text-textPrimary'}
                  />

                  {/* Notification Badge */}
                  {hasNewMessages && messageCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 min-w-5 text-xs flex items-center justify-center p-0 px-1.5"
                    >
                      {messageCount > 99 ? '99+' : messageCount}
                    </Badge>
                  )}

                  {/* Connection status indicator */}
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-black ${
                      isConnected ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />

                  {/* Animated pulse effect for new messages */}
                  {hasNewMessages && (
                    <div className="absolute inset-0 rounded-md animate-pulse bg-blue-400 opacity-20 pointer-events-none" />
                  )}
                </LinkButton>
              </TooltipTrigger>
              <TooltipContent>
                <p>Messages</p>
                {hasNewMessages && lastMessage ? (
                  <div className="text-xs text-muted-foreground mt-1 max-w-48">
                    <p>Latest: {lastMessage.sender}</p>
                    <p className="truncate">{lastMessage.content}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    {isConnected ? 'Chat is connected' : 'Chat is loading...'}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <ModeToggle />

        <div className="flex flex-col items-center">
          <NotificationBell unreadCount={unreadCount} />
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
