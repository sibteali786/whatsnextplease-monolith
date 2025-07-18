import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/utils/authTools';
import { COOKIE_NAME } from '@/utils/constant';
import { Roles } from '@prisma/client';

export interface UserState {
  id: string;
  name?: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  role: {
    id?: string;
    name: Roles | undefined;
  } | null;
}

export async function GET() {
  try {
    const token = cookies().get(COOKIE_NAME);

    if (!token) {
      return NextResponse.json({ error: 'No authentication token found' }, { status: 401 });
    }

    const user: UserState | undefined = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Current user API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
