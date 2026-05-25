'use client';

import { useState, useEffect, useRef } from 'react';

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

// Track active refresh promise to prevent duplicate silent refresh calls
let refreshPromise: Promise<boolean> | null = null;

// Listeners for state updates
const listeners = new Set<(state: ChatAuthState) => void>();

function notifyListeners() {
  listeners.forEach(listener => listener({ ...sharedAuthState }));
}

async function silentRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch('/api/proxy/chat/init-token', {
        credentials: 'include',
      });
      if (!response.ok) return false;
      const data = await response.json();
      if (!data.success || !data.token) return false;
      // Cache token/sig for use by fetchChatToken / handleChatAuthError
      sharedAuthState = { ...sharedAuthState, token: data.token, signature: data.signature };
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function fetchChatToken(): Promise<void> {
  if (sharedAuthState.isLoading) return;

  try {
    sharedAuthState = { ...sharedAuthState, isLoading: true, error: null };
    notifyListeners();

    console.log('[Chat Auth] Fetching token...');
    const ok = await silentRefresh();
    if (!ok) {
      sharedAuthState = {
        ...sharedAuthState,
        isLoading: false,
        error: 'Session expired. Please refresh the page.',
      };
      notifyListeners();
      return;
    }

    const { token, signature } = sharedAuthState;
    const url = new URL(CHAT_EMBED_URL);
    url.searchParams.set('ssoToken', token!);
    url.searchParams.set('ssoSignature', signature!);
    url.searchParams.set('t', Date.now().toString());

    sharedAuthState = {
      token,
      signature,
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
}

export async function handleChatAuthError(
  iframeRef?: React.RefObject<HTMLIFrameElement>
): Promise<void> {
  const ok = await silentRefresh();
  if (ok) {
    const { token, signature } = sharedAuthState;
    const iframe =
      iframeRef?.current ??
      (document.querySelector('iframe[title="Team Chat"]') as HTMLIFrameElement | null);
    iframe?.contentWindow?.postMessage(
      {
        source: 'wnp',
        type: 'CHAT_REAUTH',
        payload: { ssoToken: token, ssoSignature: signature },
      },
      CHAT_BASE_URL
    );
  } else {
    sharedAuthState = { ...sharedAuthState, error: 'Session expired. Please refresh the page.' };
    notifyListeners();
  }
}

export function useChatAuth() {
  const [state, setState] = useState<ChatAuthState>(sharedAuthState);
  const isMounted = useRef(true);

  useEffect(() => {
    // Register this component as a listener
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
    authPromise = fetchChatToken();

    return () => {
      isMounted.current = false;
      listeners.delete(setState);
    };
  }, []);

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
