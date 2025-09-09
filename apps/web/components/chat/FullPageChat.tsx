'use client';

import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

const CHAT_CONFIG = {
  url: process.env.CHAT_APP_URL || 'http://localhost:3000/',
  title: 'Messages',
  timeout: 15000,
  maxRetries: 3,
};

type LoadingState = 'loading' | 'loaded' | 'error' | 'timeout' | 'blocked';

interface FullPageChatProps {
  className?: string;
}

export default function FullPageChat({ className = '' }: FullPageChatProps) {
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Handle iframe load events
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      setTimeout(() => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc && iframeDoc.body && iframeDoc.body.innerHTML.length > 100) {
            setLoadingState('loaded');
            setErrorDetails('');
          } else {
            setLoadingState('blocked');
            setErrorDetails('Content blocked by security policies');
          }
        } catch (error) {
          if (error instanceof Error) {
            console.error('Iframe load error:', error);
            // Cross-origin access denied but iframe might still work
            setLoadingState('loaded');
          }
        }

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        if (retryCount > 0) {
          toast({
            title: 'Chat Loaded Successfully',
            description: 'Messages are now ready to use.',
          });
        }
      }, 2000);
    };

    const handleError = () => {
      setLoadingState('error');
      setErrorDetails('Network or resource error');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    // Set loading timeout
    timeoutRef.current = setTimeout(() => {
      if (loadingState === 'loading') {
        setLoadingState('timeout');
        setErrorDetails('Request timed out - server may be unreachable');
      }
    }, CHAT_CONFIG.timeout);

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [retryCount, loadingState, toast]);

  // Handle retry
  const handleRetry = () => {
    if (retryCount >= CHAT_CONFIG.maxRetries) {
      toast({
        title: 'Max Retries Reached',
        description: 'Please try opening the chat in a new tab instead.',
        variant: 'destructive',
      });
      return;
    }

    setLoadingState('loading');
    setRetryCount(prev => prev + 1);
    setErrorDetails('');

    if (iframeRef.current) {
      const newUrl = `${CHAT_CONFIG.url}?fullpage=true&retry=${retryCount + 1}&t=${Date.now()}`;
      iframeRef.current.src = newUrl;
    }
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Loading skeleton for full page
  const LoadingSkeleton = () => (
    <div className="h-full w-full flex flex-col animate-pulse">
      <div className="h-16 border-b bg-muted/50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-muted rounded" />
          <div className="w-32 h-5 bg-muted rounded" />
          <div className="w-16 h-4 bg-muted rounded" />
        </div>
        <div className="flex gap-2">
          <div className="w-8 h-8 bg-muted rounded" />
          <div className="w-16 h-8 bg-muted rounded" />
        </div>
      </div>
      <div className="flex-1 p-4 space-y-4">
        <div className="w-full h-12 bg-muted rounded" />
        <div className="w-3/4 h-8 bg-muted rounded" />
        <div className="w-1/2 h-8 bg-muted rounded" />
        <div className="w-full h-16 bg-muted rounded" />
        <div className="flex gap-2 mt-8">
          <div className="w-20 h-8 bg-muted rounded" />
          <div className="w-24 h-8 bg-muted rounded" />
        </div>
      </div>
    </div>
  );

  // Error state for full page
  const ErrorState = () => (
    <div className="h-full w-full flex flex-col">
      <div className="h-16 border-b bg-muted/50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          <h1 className="text-lg font-semibold">{CHAT_CONFIG.title}</h1>
          <Badge variant="destructive" className="text-xs">
            Connection Failed
          </Badge>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-6">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Unable to Load Messages</h2>
            <p className="text-muted-foreground">
              {loadingState === 'timeout' && 'The chat application is taking too long to load.'}
              {loadingState === 'blocked' && 'Content is blocked by security policies.'}
              {loadingState === 'error' && 'Unable to connect to the chat service.'}
            </p>
          </div>

          {errorDetails && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{errorDetails}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 justify-center">
            <Button
              onClick={handleRetry}
              variant="outline"
              disabled={retryCount >= CHAT_CONFIG.maxRetries}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {retryCount >= CHAT_CONFIG.maxRetries
                ? 'Max Retries'
                : `Retry (${retryCount}/${CHAT_CONFIG.maxRetries})`}
            </Button>

            <Button asChild variant="outline">
              <a href={CHAT_CONFIG.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in New Tab
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={`h-full w-full flex flex-col ${className}`}>
      {/* Header Bar */}
      <div className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-primary" />
          <h1 className="text-lg font-semibold">{CHAT_CONFIG.title}</h1>

          {loadingState === 'loaded' && (
            <Badge variant="secondary" className="text-xs">
              Connected
            </Badge>
          )}
          {loadingState === 'loading' && (
            <Badge variant="outline" className="text-xs">
              Connecting...
            </Badge>
          )}
          {(loadingState === 'error' ||
            loadingState === 'timeout' ||
            loadingState === 'blocked') && (
            <Badge variant="destructive" className="text-xs">
              Connection Issue
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {loadingState === 'loaded' && (
            <Button
              onClick={toggleFullscreen}
              variant="ghost"
              size="sm"
              className="h-8 px-3"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {loadingState === 'loading' && <LoadingSkeleton />}
        {(loadingState === 'error' || loadingState === 'timeout' || loadingState === 'blocked') && (
          <ErrorState />
        )}

        {/* Chat Iframe */}
        <iframe
          ref={iframeRef}
          src={`${CHAT_CONFIG.url}?fullpage=true&embedded=true&t=${Date.now()}`}
          title={CHAT_CONFIG.title}
          className={`w-full h-full border-0 transition-opacity duration-300 ${
            loadingState === 'loaded' ? 'opacity-100' : 'opacity-0 absolute'
          }`}
          allow="camera; microphone; clipboard-write; fullscreen"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation-by-user-activation allow-storage-access-by-user-activation"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
}
