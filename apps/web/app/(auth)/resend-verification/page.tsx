'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ResendVerificationPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      toast({
        title: 'Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Use the legacy endpoint for unauthenticated resend
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/resend-verification-by-email`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Success',
          description: 'Verification email sent! Please check your inbox.',
          variant: 'success',
        });

        setTimeout(() => {
          router.push('/signin');
        }, 2000);
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to send verification email',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Resend error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle>Resend Verification Email</CardTitle>
          <CardDescription>
            Enter your email address and w&apos;ll send you a new verification link.
            <br />
            <strong>Note:</strong> If you&apos;re signed in, check your dashboard banner for a
            quicker option.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResend} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Verification Email'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.push('/signin')}
              disabled={isLoading}
            >
              Back to Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
