'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserFromToken } from './authTools';
import { cache } from 'react';
import { COOKIE_NAME } from './constant';
import { Roles } from '@prisma/client';
export interface UserState {
  id: string;
  name?: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  role: {
    name: Roles | undefined;
  } | null;
}
export const getCurrentUser = cache(async () => {
  const token = cookies().get(COOKIE_NAME);
  if (!token) redirect('/signin');
  const user: UserState | undefined = await getUserFromToken(token);
  if (!user) {
    redirect('/signin');
  }
  return user;
});

export const signout = () => {
  cookies().delete(COOKIE_NAME);
  redirect('/signin');
};
