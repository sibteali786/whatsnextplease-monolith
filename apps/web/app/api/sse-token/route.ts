import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME } from '@/utils/constant';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET() {
  try {
    const token = cookies().get(COOKIE_NAME);

    if (!token) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/auth/sse-token`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to get SSE token' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, sseToken: data.sseToken, expiresIn: data.expiresIn });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' + (error as Error).message },
      { status: 500 }
    );
  }
}
