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
  url: process.env.CHAT_APP_URL || 'http://localhost:3000/',
  title: 'Client Messages Chat',
};

export default function ChatModal({
  chatUrl = DEFAULT_CONFIG.url,
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

  // Stable iframe URL to prevent recreation
  const iframeUrl = useRef(`${chatUrl}?modal=true&embedded=true`);

  // Handle modal state changes
  const handleModalChange = useCallback(
    (open: boolean) => {
      setIsModalOpen(open);

      if (open) {
        modalOpenTimeRef.current = Date.now();
        setIsChatLoaded(false);
        onModalOpen?.();

        // Set a timeout for iframe loading
        loadTimeoutRef.current = setTimeout(() => {
          if (!isChatLoaded) {
            console.warn('Chat iframe took too long to load');
            setIsChatLoaded(true); // Assume loaded to remove loading indicator
          }
        }, 10000); // 10 second timeout
      } else {
        setIsFullscreen(false);
        onModalClose?.();

        // Clear loading timeout
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }

        // Reset load state when modal closes
        setTimeout(() => {
          setIsChatLoaded(false);
        }, 300); // Wait for modal animation
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
          {/* Loading indicator */}
          {!isChatLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>Loading chat...</span>
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
