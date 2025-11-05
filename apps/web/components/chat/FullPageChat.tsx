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
import { getCookie } from '@/utils/utils';
import { COOKIE_NAME } from '@/utils/constant';

const CHAT_BASE_URL = (process.env.NEXT_PUBLIC_CHAT_APP_URL || 'http://localhost:3000').replace(
  /\/embed\/?$/,
  ''
);
const CHAT_EMBED_URL = `${CHAT_BASE_URL}/embed`;

const CHAT_CONFIG = {
  baseUrl: CHAT_BASE_URL,
  embedUrl: CHAT_EMBED_URL,
  title: 'Messages',
  timeout: 15000,
  maxRetries: 3,
};

type LoadingState = 'loading' | 'loaded' | 'error' | 'timeout' | 'blocked' | 'authenticating';

interface FullPageChatProps {
  className?: string;
}

export default function FullPageChat({ className = '' }: FullPageChatProps) {
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);
  const hasSentAuth = useRef(false);
  const { toast } = useToast();
  const token = getCookie(COOKIE_NAME);

  // Listen for EMBED_READY from chat app, then send auth token
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      console.log('📨 [DEBUG] Message received:', {
        origin: event.origin,
        expectedOrigin: new URL(CHAT_CONFIG.baseUrl).origin,
        data: event.data,
        source: event.data?.source,
      });
      // Only process messages from chat app
      if (event.origin !== new URL(CHAT_CONFIG.baseUrl).origin) {
        console.log('⚠️ [WNP] Ignoring message from:', event.origin);
        return;
      }

      console.log('📨 [WNP] Received from chat:', event.data);

      // Chat app is ready to receive authentication
      if (event.data?.source === 'chat-app' && event.data?.type === 'EMBED_READY') {
        if (hasSentAuth.current) {
          console.log('⚠️ [WNP] Already sent auth, skipping');
          return;
        }

        console.log('✅ [WNP] Chat ready, sending authentication...');
        hasSentAuth.current = true;

        try {
          setLoadingState('authenticating');

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

          console.log('🔑 [WNP] Token received, sending to iframe...');

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
            CHAT_CONFIG.baseUrl
          );

          console.log('✅ [WNP] INIT_CHAT sent to iframe');
          setAuthError(null);
        } catch (error) {
          console.error('❌ [WNP] Authentication failed:', error);
          setAuthError(error instanceof Error ? error.message : 'Failed to initialize chat');
          setLoadingState('error');
          hasSentAuth.current = false; // Allow retry
        }
      }

      // Handle successful authentication from chat
      if (event.data?.source === 'chat-app' && event.data?.type === 'CHAT_READY') {
        console.log('✅ [WNP] Chat authenticated and ready');
        setLoadingState('loaded'); // This is the ONLY place to set loaded
        setAuthError(null);

        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }

      // Handle errors from chat
      if (event.data?.source === 'chat-app' && event.data?.type === 'CHAT_ERROR') {
        console.error('❌ [WNP] Chat error:', event.data.payload?.error);
        setAuthError(event.data.payload?.error || 'Chat initialization failed');
        setLoadingState('error');
      }
    };

    window.addEventListener('message', handleMessage);
    console.log('👂 [WNP] Listening for chat messages');

    return () => {
      window.removeEventListener('message', handleMessage);
      hasSentAuth.current = false;
      console.log('🔇 [WNP] Stopped listening for messages');
    };
  }, [token]);

  // Handle iframe load
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      console.log('📦 [WNP] Iframe loaded');
      hasSentAuth.current = false; // Reset to allow sending auth again
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    const handleError = () => {
      console.error('❌ [WNP] Iframe load error');
      setLoadingState('error');
      setErrorDetails('Failed to load chat iframe');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    // Set timeout for entire auth flow
    timeoutRef.current = setTimeout(() => {
      if (loadingState === 'loading' || loadingState === 'authenticating') {
        console.warn('⏰ [WNP] Authentication timeout');
        setLoadingState('timeout');
        setErrorDetails('Authentication timed out - please refresh');
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
  }, [loadingState]);

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
    setAuthError(null);
    hasInitialized.current = false;
    hasSentAuth.current = false;

    if (iframeRef.current) {
      const newUrl = `${CHAT_CONFIG.embedUrl}?fullpage=true&retry=${retryCount + 1}&t=${Date.now()}`;
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
              {loadingState === 'timeout' && 'Authentication timed out'}
              {loadingState === 'blocked' && 'Content blocked by security policies'}
              {loadingState === 'error' && (authError || 'Unable to connect to chat')}
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
          {(loadingState === 'loading' || loadingState === 'authenticating') && (
            <Badge variant="outline" className="text-xs">
              {loadingState === 'authenticating' ? 'Authenticating...' : 'Loading...'}
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
        {(loadingState === 'loading' || loadingState === 'authenticating') && <LoadingSkeleton />}
        {(loadingState === 'error' || loadingState === 'timeout' || loadingState === 'blocked') && (
          <ErrorState />
        )}

        {/* Chat Iframe */}
        <iframe
          ref={iframeRef}
          src={`${CHAT_CONFIG.embedUrl}?fullpage=true&t=${Date.now()}`}
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
