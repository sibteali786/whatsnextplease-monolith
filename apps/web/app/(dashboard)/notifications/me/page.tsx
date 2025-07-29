'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/utils/authUtils';

export default function MyNotifications() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(true);
  const { user } = useCurrentUser();
  const searchParams = useSearchParams();
  useEffect(() => {
    const redirectToUserNotifications = async () => {
      try {
        if (user?.id) {
          const params = searchParams.toString();
          const redirectUrl = params
            ? `/notifications/${user.id}?${params}`
            : `/notifications/${user.id}`;
          router.replace(redirectUrl);
        } else {
          // If no user found, redirect to login or home
          router.replace('/login');
        }
      } catch (error) {
        console.error('Error getting current user:', error);
        // Fallback redirect
        router.replace('/');
      } finally {
        setIsRedirecting(false);
      }
    };

    redirectToUserNotifications();
  }, [router]);

  if (isRedirecting) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">
          Redirecting to your notifications...
        </span>
      </div>
    );
  }

  return null;
}
