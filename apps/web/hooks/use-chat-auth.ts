'use client';

import { useState, useEffect, useRef } from 'react';
import { getCookie } from '@/utils/utils';
import { COOKIE_NAME } from '@/utils/constant';

const CHAT_BASE_URL = (process.env.NEXT_PUBLIC_CHAT_APP_URL || 'http://localhost:3000').replace(
  /\/embed\/?$/,
  ''
);

const CHAT_EMBED_URL = `${CHAT_BASE_URL}/embed`;

interface ChatAuthState {
  token: string | null;
  signature: string | null;
  iframeUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

// Shared state across all hook instances
let sharedAuthState: ChatAuthState = {
  token: null,
  signature: null,
  iframeUrl: null,
  isLoading: false,
  error: null,
};

// Track active auth promise to prevent duplicate requests
let authPromise: Promise<void> | null = null;

// Listeners for state updates
const listeners = new Set<(state: ChatAuthState) => void>();

function notifyListeners() {
  listeners.forEach(listener => listener({ ...sharedAuthState }));
}

export function useChatAuth() {
  const [state, setState] = useState<ChatAuthState>(sharedAuthState);
  const token = getCookie(COOKIE_NAME);
  const isMounted = useRef(true);

  useEffect(() => {
    // Register // Register this component as a listener
    listeners.add(setState);

    // If already authenticated, return immediately
    if (sharedAuthState.iframeUrl && !sharedAuthState.error) {
      setState(sharedAuthState);
      return () => {
        listeners.delete(setState);
      };
    }

    // If auth is in progress, wait for it
    if (authPromise) {
      authPromise.then(() => {
        if (isMounted.current) {
          setState(sharedAuthState);
        }
      });
      return () => {
        listeners.delete(setState);
      };
    }

    // Start new auth
    fetchChatToken();

    return () => {
      isMounted.current = false;
      listeners.delete(setState);
    };
  }, [token]);

  const fetchChatToken = async () => {
    if (sharedAuthState.isLoading || !token) return;

    try {
      sharedAuthState = { ...sharedAuthState, isLoading: true, error: null };
      notifyListeners();

      console.log('[Chat Auth] Fetching token...');
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

      console.log('[Chat Auth] Token received, creating iframe URL');

      // Create iframe URL with token
      const url = new URL(CHAT_EMBED_URL);
      url.searchParams.set('ssoToken', data.token);
      url.searchParams.set('ssoSignature', data.signature);
      url.searchParams.set('t', Date.now().toString());

      sharedAuthState = {
        token: data.token,
        signature: data.signature,
        iframeUrl: url.toString(),
        isLoading: false,
        error: null,
      };

      notifyListeners();
      console.log('[Chat Auth] Authentication complete');
    } catch (error) {
      console.error('[Chat Auth] Failed:', error);
      sharedAuthState = {
        ...sharedAuthState,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize chat',
      };
      notifyListeners();
    } finally {
      authPromise = null;
    }
  };
  // Set the auth promise
  if (!authPromise && sharedAuthState.isLoading) {
    authPromise = Promise.resolve();
  }

  return state;
}

// Function to reset auth state (useful for logout)
export function resetChatAuth() {
  sharedAuthState = {
    token: null,
    signature: null,
    iframeUrl: null,
    isLoading: false,
    error: null,
  };
  authPromise = null;
  notifyListeners();
  console.log('[Chat Auth] State reset');
}
