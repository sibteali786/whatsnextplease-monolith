'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserFromToken } from './authTools';
import { cache } from 'react';
import { COOKIE_NAME } from './constant';
import { Roles, UserSkill } from '@prisma/client';
export interface UserState {
  id: string;
  name?: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  userSkills?: UserSkill[];
  emailVerified: boolean;
  bio: string | null;
  role: {
    name: Roles | undefined;
  } | null;
}
export const getCurrentUser = cache(async () => {
  const token = cookies().get(COOKIE_NAME);
  if (!token) redirect('/signin');

  const entity = await getUserFromToken(token);
  if (!entity) redirect('/signin');

  // Ensure minimal shape for downstream usage
  return entity;
});

export const signout = async () => {
  const cookieStore = cookies();

  [COOKIE_NAME, 'refreshToken', 'token', COOKIE_NAME].forEach(name => {
    cookieStore.delete({ name });
  });

  redirect('/signin');
};
