'use server';

import { signoutUser } from '@/actions/auth';
import { redirect } from 'next/navigation';

/**
 * Global logout handler
 * Clears cookies and redirects to signin
 */
export async function handleLogout(reason?: string) {
  // Clear auth cookies
  await signoutUser();

  // Redirect to signin with optional reason
  const redirectUrl = reason ? `/signin?reason=${reason}` : '/signin';
  redirect(redirectUrl);
}
