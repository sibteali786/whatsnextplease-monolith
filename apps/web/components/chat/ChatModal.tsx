'use client';

import { useState, useEffect } from 'react';
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
  url: 'https://chat-app-frontend-one-coral.vercel.app/',
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

  // Handle modal state changes
  const handleModalChange = (open: boolean) => {
    setIsModalOpen(open);
    if (open) {
      setIsChatLoaded(false);
      onModalOpen?.();
    } else {
      setIsFullscreen(false);
      onModalClose?.();
    }
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsChatLoaded(true);
  };

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen && isModalOpen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, isModalOpen]);

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

          {/* Chat iframe */}
          <iframe
            src={`${chatUrl}?modal=true&embedded=true&t=${Date.now()}`}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
