'use client';

import FloatingChatButton from '@/components/chat/FloatingChat';
import { createContext, useContext, useState, useEffect } from 'react';

// Chat context for managing global chat state
interface ChatContextType {
  hasNewMessages: boolean;
  messageCount: number;
  markMessagesAsRead: () => void;
  setNewMessageCount: (count: number) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}

interface ChatProviderProps {
  children: React.ReactNode;
  /** Whether to show the floating chat button */
  enableFloatingButton?: boolean;
  /** Configuration for floating button */
  floatingButtonConfig?: {
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    hideOnRoutes?: string[];
    enableMinimize?: boolean;
  };
}

export function ChatProvider({
  children,
  enableFloatingButton = true,
  floatingButtonConfig = {},
}: ChatProviderProps) {
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [messageCount, setMessageCount] = useState(0);

  // Simulate message notifications (replace with your actual logic)
  useEffect(() => {
    // This would typically connect to your notification system
    // For now, it's a placeholder for demonstration
    // const simulateMessages = () => {
    //   // Replace this with actual WebSocket/SSE connection to your chat service
    //   const randomCount = Math.floor(Math.random() * 5);
    //   if (randomCount > 0) {
    //     setMessageCount(randomCount);
    //     setHasNewMessages(true);
    //   }
    // };
    // Simulate receiving messages every 30 seconds (remove in production)
    // const interval = setInterval(simulateMessages, 30000);
    // return () => clearInterval(interval);
  }, []);

  const markMessagesAsRead = () => {
    setHasNewMessages(false);
    setMessageCount(0);
  };

  const setNewMessageCount = (count: number) => {
    setMessageCount(count);
    setHasNewMessages(count > 0);
  };

  const contextValue: ChatContextType = {
    hasNewMessages,
    messageCount,
    markMessagesAsRead,
    setNewMessageCount,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}

      {enableFloatingButton && (
        <FloatingChatButton
          hasNotifications={hasNewMessages}
          notificationCount={messageCount}
          position={floatingButtonConfig.position || 'bottom-right'}
          hideOnRoutes={floatingButtonConfig.hideOnRoutes || ['/messages']}
          enableMinimize={floatingButtonConfig.enableMinimize !== false}
        />
      )}
    </ChatContext.Provider>
  );
}

// Hook for components that want to trigger chat notifications
export function useChatNotifications() {
  const { setNewMessageCount, markMessagesAsRead } = useChatContext();

  return {
    setNewMessageCount,
    markMessagesAsRead,
    // Add other notification-related functions here
  };
}
