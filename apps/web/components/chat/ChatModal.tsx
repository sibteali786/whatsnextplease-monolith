'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Maximize2, Minimize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { COOKIE_NAME } from '@/utils/constant';
import { getCookie } from '@/utils/utils';

interface ChatModalProps {
  /** Chat application URL */
  chatUrl?: string;
  /** Modal title */
  title?: string;
  /** Trigger button text */
  triggerText?: string;
  /** Custom trigger button component */
  trigger?: React.ReactNode;
  /** Additional CSS classes for the modal */
  className?: string;
  /** Whether to show the modal in fullscreen initially */
  defaultFullscreen?: boolean;
  /** Callback when modal opens */
  onModalOpen?: () => void;
  /** Callback when modal closes */
  onModalClose?: () => void;
}

const DEFAULT_CONFIG = {
  baseUrl: (process.env.NEXT_PUBLIC_CHAT_APP_URL || 'http://localhost:3000').replace(
    /\/embed\/?$/,
    ''
  ),
  embedUrl:
    (process.env.NEXT_PUBLIC_CHAT_APP_URL || 'http://localhost:3000').replace(/\/embed\/?$/, '') +
    '/embed',
  title: 'Client Messages Chat',
};

export default function ChatModal({
  chatUrl = DEFAULT_CONFIG.embedUrl,
  title = DEFAULT_CONFIG.title,
  triggerText = 'Open Chat',
  trigger,
  className = '',
  defaultFullscreen = false,
  onModalOpen,
  onModalClose,
}: ChatModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(defaultFullscreen);
  const [isChatLoaded, setIsChatLoaded] = useState(false);

  // Use refs to prevent unnecessary iframe recreation
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof window.setTimeout>>();
  const modalOpenTimeRef = useRef<number>(0);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const hasInitialized = useRef(false);
  const token = getCookie(COOKIE_NAME);

  // Stable iframe URL to prevent recreation
  const iframeUrl = useRef(`${DEFAULT_CONFIG.embedUrl}?modal=true&embedded=true`);

  // Handle modal state changes
  const handleModalChange = useCallback(
    (open: boolean) => {
      setIsModalOpen(open);

      if (open) {
        modalOpenTimeRef.current = Date.now();
        setIsChatLoaded(false);
        hasInitialized.current = false; // ADD THIS LINE
        onModalOpen?.();

        loadTimeoutRef.current = setTimeout(() => {
          if (!isChatLoaded) {
            console.warn('Chat iframe took too long to load');
            setIsChatLoaded(true);
          }
        }, 10000);
      } else {
        setIsFullscreen(false);
        hasInitialized.current = false; // ADD THIS LINE
        setAuthError(null); // ADD THIS LINE
        onModalClose?.();

        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }

        setTimeout(() => {
          setIsChatLoaded(false);
        }, 300);
      }
    },
    [onModalOpen, onModalClose, isChatLoaded]
  );

  // Handle fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Handle iframe load with debouncing to prevent multiple calls
  const handleIframeLoad = useCallback(() => {
    const loadTime = Date.now() - modalOpenTimeRef.current;

    // Only set as loaded if modal has been open for at least 500ms
    // This prevents rapid load/unload cycles
    if (loadTime > 500) {
      setIsChatLoaded(true);

      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }

      console.log(`Chat iframe loaded in ${loadTime}ms`);
    } else {
      // If loaded too quickly, it might be a cache/reload, wait a bit
      setTimeout(() => {
        setIsChatLoaded(true);
      }, 1000);
    }
  }, []);

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen && isModalOpen) {
        setIsFullscreen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isFullscreen, isModalOpen]);

  // Update iframe URL when chatUrl changes
  useEffect(() => {
    iframeUrl.current = `${chatUrl}?modal=true&embedded=true&t=${Date.now()}`;
  }, [chatUrl]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);
  // Initialize chat with authentication token
  useEffect(() => {
    if (!isModalOpen || !isChatLoaded || hasInitialized.current) return;

    const initChatAuth = async () => {
      try {
        setIsAuthenticating(true);
        setAuthError(null);

        // Fetch token from WNP backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/init-token`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to get chat token');
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Authentication failed');
        }

        // Wait a bit for iframe to be fully ready
        await new Promise(resolve => setTimeout(resolve, 500));

        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) {
          throw new Error('Chat iframe not ready');
        }

        // Send authentication message to chat app
        iframe.contentWindow.postMessage(
          {
            source: 'wnp-app',
            type: 'INIT_CHAT',
            payload: {
              token: data.token,
              signature: data.signature,
            },
          },
          DEFAULT_CONFIG.baseUrl
        );

        hasInitialized.current = true;
        console.log('✅ Chat authentication sent successfully');
      } catch (error) {
        console.error('Chat authentication error:', error);
        setAuthError(error instanceof Error ? error.message : 'Failed to initialize chat');
      } finally {
        setIsAuthenticating(false);
      }
    };

    initChatAuth();
  }, [isModalOpen, isChatLoaded, chatUrl]);
  // Default trigger button
  const defaultTrigger = (
    <Button className="flex items-center gap-2">
      <MessageSquare className="w-4 h-4" />
      {triggerText}
    </Button>
  );

  return (
    <Dialog open={isModalOpen} onOpenChange={handleModalChange}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className={`${
          isFullscreen
            ? 'max-w-none max-h-none h-screen w-screen m-0 rounded-none'
            : 'max-w-6xl h-[85vh]'
        } p-0 transition-all duration-300 ${className}`}
      >
        <DialogHeader className="flex-row items-center justify-between p-4 border-b space-y-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="w-5 h-5" />
            {title}
            {isChatLoaded && (
              <Badge variant="secondary" className="text-xs">
                Connected
              </Badge>
            )}
            {!isChatLoaded && (
              <Badge variant="outline" className="text-xs">
                Loading...
              </Badge>
            )}
          </DialogTitle>

          <div className="flex items-center gap-1">
            <Button
              onClick={toggleFullscreen}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>

            <Button
              onClick={() => handleModalChange(false)}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Close chat"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 relative">
          {/* Loading/Auth indicator */}
          {(!isChatLoaded || isAuthenticating) && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>{!isChatLoaded ? 'Loading chat...' : 'Authenticating...'}</span>
              </div>
            </div>
          )}

          {/* Auth Error */}
          {authError && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-4 text-center p-6">
                <div className="text-destructive text-lg font-semibold">Authentication Failed</div>
                <p className="text-muted-foreground text-sm max-w-md">{authError}</p>
                <Button
                  onClick={() => {
                    hasInitialized.current = false;
                    setAuthError(null);
                    setIsChatLoaded(false);
                  }}
                  variant="outline"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Chat iframe - only render when modal is open */}
          {isModalOpen && (
            <iframe
              ref={iframeRef}
              src={iframeUrl.current}
              title={title}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              style={{
                height: isFullscreen ? 'calc(100vh - 60px)' : 'calc(85vh - 60px)',
                minHeight: '400px',
              }}
              allow="camera; microphone; clipboard-write"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation-by-user-activation"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
