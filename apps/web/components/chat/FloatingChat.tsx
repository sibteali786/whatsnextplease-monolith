/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ChatModal from './ChatModal'; // Adjust import path as needed
import { usePathname } from 'next/navigation';

interface FloatingChatButtonProps {
  /** Position of the floating button */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Hide on specific routes */
  hideOnRoutes?: string[];
  /** Show notification badge */
  hasNotifications?: boolean;
  /** Notification count */
  notificationCount?: number;
  /** Custom z-index */
  zIndex?: number;
  /** Enable minimize/expand animation */
  enableMinimize?: boolean;
}

const POSITION_CLASSES = {
  'bottom-right': 'bottom-6 right-6',
  'bottom-left': 'bottom-6 left-6',
  'top-right': 'top-24 right-6',
  'top-left': 'top-24 left-6',
};

export default function FloatingChatButton({
  position = 'bottom-right',
  hideOnRoutes = ['/messages'], // Hide on main messages page
  hasNotifications = false,
  notificationCount = 0,
  zIndex = 50,
  enableMinimize = true,
}: FloatingChatButtonProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const pathname = usePathname();

  // Hide button on specific routes
  useEffect(() => {
    const shouldHide = hideOnRoutes.some(route => pathname.startsWith(route));
    setIsVisible(!shouldHide);
  }, [pathname, hideOnRoutes]);

  // Handle scroll behavior (optional - hide on scroll down, show on scroll up)
  useEffect(() => {
    if (!enableMinimize) return;

    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Only minimize if scrolling down and past a threshold
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsMinimized(true);
      } else if (currentScrollY < lastScrollY) {
        setIsMinimized(false);
      }

      lastScrollY = currentScrollY;
    };

    const throttledHandleScroll = throttle(handleScroll, 100);
    window.addEventListener('scroll', throttledHandleScroll);

    return () => window.removeEventListener('scroll', throttledHandleScroll);
  }, [enableMinimize]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed ${POSITION_CLASSES[position]} transition-all duration-300 ease-in-out`}
      style={{ zIndex }}
    >
      <div
        className={`transition-transform duration-300 ${isMinimized ? 'scale-75 opacity-75' : 'scale-100 opacity-100'}`}
      >
        <ChatModal
          trigger={
            <Button
              size="lg"
              className={`relative rounded-full shadow-lg hover:shadow-xl transition-all duration-200 group ${
                isMinimized ? 'w-12 h-12 p-0' : 'px-4 py-2'
              }`}
              title="Open chat"
            >
              <MessageSquare
                className={`${isMinimized ? 'w-5 h-5' : 'w-5 h-5 mr-2'} transition-all duration-200`}
              />

              {!isMinimized && <span className="font-medium">Chat</span>}

              {/* Notification Badge */}
              {hasNotifications && (
                <Badge
                  variant="destructive"
                  className={`absolute -top-1 -right-1 h-5 min-w-5 text-xs flex items-center justify-center p-0 ${
                    notificationCount > 0 ? 'px-1.5' : ''
                  }`}
                >
                  {notificationCount > 0
                    ? notificationCount > 99
                      ? '99+'
                      : notificationCount
                    : ''}
                </Badge>
              )}

              {/* Pulse effect for notifications */}
              {hasNotifications && (
                <div className="absolute inset-0 rounded-full animate-pulse bg-red-400 opacity-20"></div>
              )}
            </Button>
          }
          title="Quick Chat"
          defaultFullscreen={false}
          onModalOpen={() => {
            // Optional: Mark notifications as seen when chat opens
            console.log('Floating chat opened');
          }}
          onModalClose={() => {
            console.log('Floating chat closed');
          }}
        />
      </div>

      {/* Optional minimize toggle (for manual control) */}
      {enableMinimize && !isMinimized && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute -top-2 -left-2 w-6 h-6 p-0 rounded-full bg-background border opacity-60 hover:opacity-100"
          onClick={() => setIsMinimized(true)}
        >
          <Minus className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

// Utility function for throttling scroll events
function throttle<T extends (...args: any[]) => void>(func: T, limit: number): T {
  let inThrottle: boolean;
  return ((...args: any[]) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
}
