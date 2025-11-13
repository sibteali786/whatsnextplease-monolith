'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
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
import { useChatAuth } from '@/hooks/use-chat-auth';

interface ChatModalProps {
  /** Modal title */
  title?: string;
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
  title: 'Client Messages Chat',
};

export default function ChatModal({
  title = DEFAULT_CONFIG.title,
  trigger,
  className = '',
  defaultFullscreen = false,
  onModalOpen,
  onModalClose,
}: ChatModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(defaultFullscreen);
  const [isChatLoaded, setIsChatLoaded] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof window.setTimeout>>();
  const modalOpenTimeRef = useRef<number>(0);

  // Use shared auth hook
  const { iframeUrl, isLoading: isAuthenticating, error: authError } = useChatAuth();

  // Handle modal state changes
  const handleModalChange = useCallback(
    (open: boolean) => {
      setInternalOpen(open);

      if (open) {
        modalOpenTimeRef.current = Date.now();
        setIsChatLoaded(false);
        onModalOpen?.();

        // Set timeout for iframe load
        loadTimeoutRef.current = setTimeout(() => {
          if (!isChatLoaded) {
            console.warn('Chat iframe took too long to load');
            setIsChatLoaded(true);
          }
        }, 10000);
      } else {
        setIsFullscreen(false);
        onModalClose?.();

        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }

        // Small delay before resetting loaded state
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

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    const loadTime = Date.now() - modalOpenTimeRef.current;

    if (loadTime > 500) {
      setIsChatLoaded(true);

      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }

      console.log(`Chat iframe loaded in ${loadTime}ms`);
    } else {
      setTimeout(() => {
        setIsChatLoaded(true);
      }, 1000);
    }
  }, []);

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen && internalOpen) {
        setIsFullscreen(false);
      }
    };

    if (internalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isFullscreen, internalOpen]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  // Default trigger button
  const defaultTrigger = (
    <Button className="flex items-center gap-2">
      <MessageSquare className="w-4 h-4" />
      Open Chat
    </Button>
  );

  return (
    <Dialog open={internalOpen} onOpenChange={handleModalChange}>
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
                <span>{isAuthenticating ? 'Authenticating...' : 'Loading chat...'}</span>
              </div>
            </div>
          )}

          {/* Auth Error */}
          {authError && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-4 text-center p-6">
                <div className="text-destructive text-lg font-semibold">Authentication Failed</div>
                <p className="text-muted-foreground text-sm max-w-md">{authError}</p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Chat iframe - only render when modal is open and we have auth */}
          {internalOpen && iframeUrl && !authError && (
            <iframe
              ref={iframeRef}
              src={iframeUrl}
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
