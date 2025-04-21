'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ReactNode, Suspense, useEffect } from 'react';
import { Logo } from '@/components/assets/Logo';
import 'nprogress/nprogress.css'; // Import the default styles
import '@/styles/nprogress.css'; // Import our custom styles
import RouteProgressBar from '@/components/RoutesProgressBar';

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  const pathname = usePathname();
  const isSignUp = pathname.includes('signup');

  // Pre-fetch the home page to make navigation feel faster
  useEffect(() => {
    // This tells Next.js to prefetch the home page
    const prefetchHome = async () => {
      try {
        await fetch('/home');
      } catch (e) {
        // Silently fail if prefetch fails
        console.error('Prefetch failed:', e);
      }
    };

    prefetchHome();
  }, []);

  return (
    <>
      <Suspense fallback={<div className="h-screen w-screen bg-background" />}>
        <RouteProgressBar />
      </Suspense>
      <div className="min-h-screen flex flex-col justify-center items-center py-6 overflow-y-auto">
        {/* Top Logo and Heading */}
        <div className="mb-12 text-center flex flex-row justify-center items-center gap-6">
          <Logo width={120} height={120} />
        </div>
        {children}

        {/* Link to switch between sign in and sign up */}
        <div className="mt-12 text-center text-sm">
          {isSignUp ? (
            <p className="flex flex-row gap-2 text-lg">
              Already have an account?{' '}
              <Link href="/signin" className="text-purple-600 font-semibold">
                Log in
              </Link>
            </p>
          ) : (
            <p className="flex flex-row gap-2 text-lg">
              Don&apos;t have an account yet?{' '}
              <Link href="/signup" className="text-purple-600">
                Create New Account
              </Link>
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default AuthLayout;
