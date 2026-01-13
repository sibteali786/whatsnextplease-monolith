import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/me`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
        cache: 'no-store',
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      return NextResponse.json(
        { error: result?.message || 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const entity = result.user ?? result.client;
    if (!entity) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: entity,
      isClient: Boolean(result.client),
    });
  } catch (error) {
    console.error('Current user API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
