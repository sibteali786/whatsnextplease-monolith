/* eslint-disable @typescript-eslint/no-explicit-any */
import { CHAT_APP, ChatMessageType, ParentChatInfoTypes } from '@/utils/chat/constants';

interface ParentAppConfig {
  appId: string;
  appName: string;
  chatAppOrigin: string;
  enableLogging?: boolean;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: number;
}

interface NotificationCallbacks {
  onNewMessage?: (data: any) => void;
  onMessageCountUpdate?: (count: number) => void;
  onMessagesRead?: () => void;
  onChatReady?: () => void;
  onChatDisconnected?: () => void;
}

export class ParentAppMessenger {
  private config: ParentAppConfig;
  private callbacks: NotificationCallbacks = {};
  private isConnected = false;
  private messageCount = 0;
  private lastMessage: ChatMessage | null = null;

  constructor(config: ParentAppConfig) {
    this.config = {
      enableLogging: false,
      ...config,
    };
    this.setupMessageListener();
  }

  // Register callback functions
  public onNewMessage(callback: (data: any) => void) {
    this.callbacks.onNewMessage = callback;
    return this;
  }

  public onMessageCountUpdate(callback: (count: number) => void) {
    this.callbacks.onMessageCountUpdate = callback;
    return this;
  }

  public onMessagesRead(callback: () => void) {
    this.callbacks.onMessagesRead = callback;
    return this;
  }

  public onChatReady(callback: () => void) {
    this.callbacks.onChatReady = callback;
    return this;
  }

  public onChatDisconnected(callback: () => void) {
    this.callbacks.onChatDisconnected = callback;
    return this;
  }

  // Get current state
  public getState() {
    return {
      isConnected: this.isConnected,
      messageCount: this.messageCount,
      lastMessage: this.lastMessage,
      hasNewMessages: this.messageCount > 0,
    };
  }

  public sendToChat(type: string, payload?: any) {
    const chatIframe = this.getChatIframe();
    if (chatIframe && chatIframe.contentWindow) {
      const message = {
        source: this.config.appId,
        type,
        payload: {
          ...payload,
          parentApp: {
            id: this.config.appId,
            name: this.config.appName,
          },
        },
        timestamp: Date.now(),
      };

      chatIframe.contentWindow.postMessage(message, this.config.chatAppOrigin);

      if (this.config.enableLogging) {
        console.log(`[${this.config.appName}] Sent to chat:`, message);
      }
    } else {
      console.warn(`[${this.config.appName}] Chat iframe not found or not ready`);
    }
  }

  // Mark messages as read
  public markMessagesAsRead() {
    this.messageCount = 0;
    this.sendToChat(ParentChatInfoTypes.Enum.MARK_AS_READ);
    this.callbacks.onMessagesRead?.();
  }

  // Send user information to chat
  public sendUserInfo(userInfo: any) {
    this.sendToChat(ParentChatInfoTypes.Enum.USER_INFO_UPDATE, { user: userInfo });
  }

  // Send theme information to chat
  public sendTheme(theme: string) {
    this.sendToChat(ParentChatInfoTypes.Enum.THEME_UPDATE, { theme });
  }

  // Send any custom data to chat
  public sendCustomData(type: string, data: any) {
    this.sendToChat(`CUSTOM_${type.toUpperCase()}`, data);
  }

  private setupMessageListener() {
    window.addEventListener('message', (event: MessageEvent) => {
      // Security check
      if (!this.isValidOrigin(event.origin)) {
        if (this.config.enableLogging) {
          console.warn(
            `[${this.config.appName}] Ignored message from unauthorized origin:`,
            event.origin
          );
        }
        return;
      }

      // Check if message is from chat app
      if (event.data?.source === CHAT_APP) {
        this.handleChatMessage(event.data);
      }
    });
  }

  private handleChatMessage(data: any) {
    if (this.config.enableLogging) {
      console.log(`[${this.config.appName}] Received from chat:`, data);
    }

    switch (data.type) {
      case ChatMessageType.Enum.CHAT_READY:
        this.isConnected = true;
        this.callbacks.onChatReady?.();
        // Send initial parent app info
        this.sendToChat('PARENT_APP_INFO', {
          id: this.config.appId,
          name: this.config.appName,
          timestamp: Date.now(),
        });
        break;

      case ChatMessageType.Enum.NEW_MESSAGE:
        const messageData = data.payload;
        this.lastMessage = {
          id: messageData.messageId || Date.now().toString(),
          content: messageData.preview || 'New message',
          sender: messageData.sender || 'Unknown',
          timestamp: messageData.timestamp || Date.now(),
        };
        this.messageCount = messageData.unreadCount || 1;
        this.callbacks.onNewMessage?.(messageData);
        break;

      case ChatMessageType.Enum.MESSAGE_COUNT_UPDATE:
        this.messageCount = data.payload?.count || 0;
        this.callbacks.onMessageCountUpdate?.(this.messageCount);
        break;

      case ChatMessageType.Enum.MESSAGE_READ:
        this.messageCount = 0;
        this.callbacks.onMessagesRead?.();
        break;

      case ChatMessageType.Enum.CHAT_DISCONNECTED:
        this.isConnected = false;
        this.callbacks.onChatDisconnected?.();
        break;

      default:
        if (this.config.enableLogging) {
          console.log(`[${this.config.appName}] Unknown message type:`, data.type);
        }
    }
  }

  private isValidOrigin(origin: string): boolean {
    const allowedOrigins = [
      this.config.chatAppOrigin,
      'http://localhost:3001', // Development
      window.location.origin,
    ];

    if (process.env.NODE_ENV === 'production') {
      return allowedOrigins.some(allowed =>
        origin.includes(allowed.replace('https://', '').replace('http://', ''))
      );
    }

    return true; // Allow all origins in development
  }

  private getChatIframe(): HTMLIFrameElement | null {
    return document.querySelector('iframe[title*="Chat"]') as HTMLIFrameElement;
  }

  // Cleanup method
  public destroy() {
    // Remove event listeners, cleanup resources
    this.callbacks = {};
    this.isConnected = false;
  }
}
