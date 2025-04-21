'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ReactNode, useState } from 'react';
import { Logo } from '@/components/assets/Logo';
import { TopProgressBar } from '@/components/TopProgressBar';

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);

  const isSignUp = pathname.includes('signup');

  // This is a global event listener that can be used to show the progress bar
  // when navigation is happening
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      setIsLoading(true);
    });
  }

  return (
    <>
      <TopProgressBar isLoading={isLoading} />
      <div className="min-h-screen flex flex-col justify-center items-center py-6 overflow-y-auto">
        <div className="mb-12 text-center flex flex-row justify-center items-center gap-6">
          <Logo width={120} height={120} />
        </div>
        {children}

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
