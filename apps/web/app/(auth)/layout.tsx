"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ReactNode } from "react";
import { Logo } from "@/components/assets/Logo";

// Define type for props
interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  const pathname = usePathname();

  // Determine if the current path is /signin or /signup
  const isSignUp = pathname.includes("signup");

  return (
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
            Already have an account?{" "}
            <Link href="/signin" className="text-purple-600 font-semibold">
              Log in
            </Link>
          </p>
        ) : (
          <p className="flex flex-row gap-2 text-lg">
            Don’t have an account yet?{" "}
            <Link href="/signup" className="text-purple-600">
              Create New Account
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthLayout;
