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
import { useChatAuth } from '@/hooks/use-chat-auth';

const CHAT_BASE_URL = (process.env.NEXT_PUBLIC_CHAT_APP_URL || 'http://localhost:3000').replace(
  /\/embed\/?$/,
  ''
);
const CHAT_EMBED_URL = `${CHAT_BASE_URL}/embed`;

const CHAT_CONFIG = {
  baseUrl: CHAT_BASE_URL,
  embedUrl: CHAT_EMBED_URL,
  title: 'Messages',
  timeout: 20000,
  maxRetries: 3,
};

type LoadingState = 'loading' | 'loaded' | 'error' | 'timeout';

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

  // Use shared auth hook
  const { iframeUrl, isLoading: isAuthenticating, error: authError } = useChatAuth();

  // Set loading state based on auth status
  useEffect(() => {
    if (isAuthenticating) {
      setLoadingState('loading');
    } else if (authError) {
      setErrorDetails(authError);
      setLoadingState('error');
    }
  }, [isAuthenticating, authError]);

  // Listen for CHAT_READY message (optional, for tracking)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== new URL(CHAT_CONFIG.baseUrl).origin) {
        return;
      }

      if (event.data?.source === 'chat-app' && event.data?.type === 'CHAT_READY') {
        console.log('✅ [WNP] Chat ready');
        setLoadingState('loaded');

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }

      if (event.data?.source === 'chat-app' && event.data?.type === 'CHAT_ERROR') {
        console.error('❌ [WNP] Chat error:', event.data.payload?.error);
        setErrorDetails(event.data.payload?.error || 'Chat initialization failed');
        setLoadingState('error');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle iframe load
  const handleIframeLoad = () => {
    console.log('📦 [WNP] Iframe loaded');

    // Give socket 2 seconds to connect, then assume success
    setTimeout(() => {
      if (loadingState === 'loading') {
        setLoadingState('loaded');
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }
    }, 5000);
  };

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

    console.log('🔄 [WNP] Retrying...');
    setLoadingState('loading');
    setRetryCount(prev => prev + 1);
    setErrorDetails('');
    // Force re-fetch by reloading the page or resetting auth state
    window.location.reload();
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

  useEffect(() => {
    if (iframeUrl) {
      console.log('[FullPageChat] Iframe URL ready:', iframeUrl);
    }
  }, [iframeUrl]);

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="h-full w-full flex flex-col animate-pulse">
      <div className="h-16 border-b bg-muted/50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-muted rounded" />
          <div className="w-32 h-5 bg-muted rounded" />
          <div className="w-16 h-4 bg-muted rounded" />
        </div>
      </div>
      <div className="flex-1 p-4 space-y-4">
        <div className="w-full h-12 bg-muted rounded" />
        <div className="w-3/4 h-8 bg-muted rounded" />
        <div className="w-1/2 h-8 bg-muted rounded" />
      </div>
    </div>
  );

  // Error state
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
              {loadingState === 'timeout' && 'Connection timed out'}
              {loadingState === 'error' && (errorDetails || 'Unable to connect to chat')}
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
              <a href={`${CHAT_CONFIG.embedUrl}`} target="_blank" rel="noopener noreferrer">
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
              Loading...
            </Badge>
          )}
          {(loadingState === 'error' || loadingState === 'timeout') && (
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
        {(loadingState === 'error' || loadingState === 'timeout') && <ErrorState />}

        {/* Chat Iframe */}
        {iframeUrl && !authError && (
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            title={CHAT_CONFIG.title}
            className={`w-full h-full border-0 transition-opacity duration-300 ${
              loadingState === 'loaded' ? 'opacity-100' : 'opacity-0 absolute'
            }`}
            onLoad={handleIframeLoad}
            allow="camera; microphone; clipboard-write; fullscreen"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation-by-user-activation allow-storage-access-by-user-activation"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>
    </div>
  );
}
