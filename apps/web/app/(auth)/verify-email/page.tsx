'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    verifyEmail(token);
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        setMessage(data.message || 'Email verified successfully!');

        // Redirect to home/dashboard after 3 seconds
        setTimeout(() => {
          router.push('/home');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.message || 'Verification failed. Please try again.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
      setMessage('An error occurred during verification. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            {status === 'verifying' && <Loader2 className="h-8 w-8 animate-spin text-blue-600" />}
            {status === 'success' && <CheckCircle2 className="h-8 w-8 text-green-600" />}
            {status === 'error' && <XCircle className="h-8 w-8 text-red-600" />}
          </div>
          <CardTitle>
            {status === 'verifying' && 'Verifying Your Email'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'success' && (
            <p className="text-center text-sm text-gray-600">
              Redirecting you to your dashboard...
            </p>
          )}

          {status === 'error' && (
            <p className="text-center text-sm text-gray-600">
              Please sign in to your account and use the &quot;Resend Email&quot; button in the
              banner.
            </p>
          )}

          <Button
            onClick={() => router.push(status === 'success' ? '/home' : '/signin')}
            variant="default"
            className="w-full"
          >
            {status === 'success' ? 'Go to Dashboard' : 'Go to Sign In'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
