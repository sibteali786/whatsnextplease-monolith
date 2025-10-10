'use client';

import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema } from '@/utils/validationSchemas';
import { signinUser } from '@/actions/auth';
import { z } from 'zod';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useLoggedInUserState } from '@/store/useUserStore';
import { useLoggedInClientState } from '@/store/useClientStore';
import { trimWhitespace } from '@/utils/utils';
import { useToast } from '@/hooks/use-toast';
import { LoadingOverlay } from './LoadingOverlay';
import NProgress from 'nprogress';

const SignInForm = () => {
  const router = useRouter();
  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    mode: 'onSubmit',
  });
  const { setUser } = useLoggedInUserState();
  const { setClient } = useLoggedInClientState();
  const [showPassword, setShowPassword] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Pre-fetch the home page
  useEffect(() => {
    const prefetchDashboard = async () => {
      try {
        // This will make the navigation feel faster
        await fetch('/home');
      } catch (e) {
        // Silently fail
        console.error('Prefetch failed:', e);
      }
    };

    prefetchDashboard();
  }, []);

  useEffect(() => {
    if (searchParams.get('deleted') === 'true') {
      toast({
        title: 'Account Deleted',
        description: 'Your account has been successfully deleted',
        variant: 'default',
      });
    }
  }, [searchParams, toast]);

  const onSubmit = async (data: z.infer<typeof signInSchema>) => {
    try {
      // Start the progress bar
      NProgress.start();

      // Show loading toast
      toast({
        title: 'Authenticating',
        description: 'Verifying your credentials...',
      });

      // Trim whitespace for all fields
      const trimmedData = trimWhitespace(data);

      const formData = new FormData();
      formData.append('username', trimmedData.username);
      formData.append('password', trimmedData.password);

      const response = await signinUser(formData);

      if (response && response.success) {
        // Update progress bar
        NProgress.set(0.7);

        // Update stores with user/client data
        if (response.user) {
          setUser(response.user);
        }
        if (response.client) {
          setClient(response.client);
        }

        toast({
          title: 'Success!',
          description: 'Login successful, redirecting to dashboard...',
          variant: 'success',
        });

        // Show navigation overlay
        setIsNavigating(true);

        // Complete the progress bar
        NProgress.set(0.9);

        // Slight delay to ensure toast and progress bar are visible
        setTimeout(() => {
          NProgress.done();
          router.push('/home');
        }, 800);
      } else if (response && !response.success && response.message) {
        NProgress.done();
        form.setError('root', { message: response.message });
        toast({
          title: 'Authentication Failed',
          description: response.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      NProgress.done();
      console.error('Failed to sign you in: ', error);
      form.setError('root', {
        message: error instanceof Error ? error.message : 'Failed to sign in',
      });
      toast({
        title: 'Error',
        description: 'An unexpected error occurred during login',
        variant: 'destructive',
      });
    }
  };

  const pathname = usePathname();
  const isSignUp = pathname.includes('signup');

  return (
    <>
      {isNavigating && <LoadingOverlay message="Redirecting to dashboard..." />}
      <div className="w-full max-w-[600px] mx-auto flex-grow border border-default-100 shadow-lg rounded-lg">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="bg-content1 p-6 flex flex-col justify-between gap-4 min-h-[100%]"
          >
            <h1 className="text-3xl font-bold">{!isSignUp && 'Sign In'}</h1>
            <div>
              {/* Username Field */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="username">Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Username" autoComplete="username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password Field with Show/Hide Toggle */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="password">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Password"
                          autoComplete="current-password"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500"
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button
              type="submit"
              className="mt-4"
              disabled={form.formState.isSubmitting || isNavigating}
            >
              {form.formState.isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin h-4 w-4" />
                  <span>Signing in...</span>
                </div>
              ) : (
                'LOG IN'
              )}
            </Button>

            {form.formState.errors.root && (
              <p className="text-red-500 text-center">{form.formState.errors.root.message}</p>
            )}

            {/* Additional Options */}
            <div className="flex justify-between items-center mt-4 text-sm">
              <div className="flex items-center gap-2">
                <Checkbox id="remember-me" />
                <Label htmlFor="remember-me">Remember me</Label>
              </div>
              <div className="flex items-center justify-between">
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </>
  );
};

export default SignInForm;
