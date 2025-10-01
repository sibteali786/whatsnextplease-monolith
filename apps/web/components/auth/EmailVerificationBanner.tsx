'use client';

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCookie } from '@/utils/utils';
import { COOKIE_NAME } from '@/utils/constant';

interface EmailVerificationBannerProps {
  email: string;
}

export function EmailVerificationBanner({ email }: EmailVerificationBannerProps) {
  const [resending, setResending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleResendVerification = async () => {
    setResending(true);

    try {
      const token = getCookie(COOKIE_NAME);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEmailSent(true);
        toast({
          title: 'Success',
          description: 'Verification email sent! Please check your inbox.',
          variant: 'success',
        });

        // Reset the "email sent" state after 5 seconds
        setTimeout(() => {
          setEmailSent(false);
        }, 5000);
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to send verification email',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
      <Mail className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="font-medium text-yellow-800 dark:text-yellow-200">
            Please verify your email address
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            We sent a verification link to <strong>{email}</strong>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResendVerification}
          disabled={resending || emailSent}
          className="shrink-0"
        >
          {resending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : emailSent ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Email Sent
            </>
          ) : (
            'Resend Email'
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
