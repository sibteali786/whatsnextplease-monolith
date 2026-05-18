import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME, REFRESH_COOKIE_NAME } from '@/utils/constant';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const refreshLocks = new Map<string, Promise<string | null>>();

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string | null;
  newRefreshToken: string | null;
  expiresIn: number | null;
  refreshExpiresIn: number | null;
}> {
  try {
    console.log('🔄 Attempting token refresh...');

    const response = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      console.error('❌ Token refresh failed:', response.status);
      return { accessToken: null, newRefreshToken: null, expiresIn: null, refreshExpiresIn: null };
    }

    const data = await response.json();

    if (data.success && data.token) {
      console.log('✅ Token refresh successful');
      return {
        accessToken: data.token,
        newRefreshToken: data.refreshToken || refreshToken, // Use new or keep old
        expiresIn: data.expiresIn || 36000, // Default 10 hours based on your Keycloak
        refreshExpiresIn: data.refreshExpiresIn || 604800, // Default 7 days
      };
    }

    return { accessToken: null, newRefreshToken: null, expiresIn: null, refreshExpiresIn: null };
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    return { accessToken: null, newRefreshToken: null, expiresIn: null, refreshExpiresIn: null };
  }
}

/**
 * Get or refresh access token with concurrency protection
 */
async function getValidAccessToken(): Promise<string | null> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get(COOKIE_NAME);
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME);

  // If we have a valid access token, return it
  if (accessToken?.value) {
    // TODO: Add JWT expiry check here for optimization
    // For now, assume token is valid if it exists
    return accessToken.value;
  }

  console.log('⚠️  No access token found, attempting refresh...');

  // No access token - need to refresh
  if (!refreshToken?.value) {
    console.error('❌ No refresh token available');
    return null;
  }

  // Check if refresh is already in progress for this token
  const lockKey = refreshToken.value;
  const existingLock = refreshLocks.get(lockKey);

  if (existingLock) {
    console.log('⏳ Waiting for ongoing token refresh...');
    return await existingLock;
  }

  // Create new refresh promise
  const refreshPromise = (async () => {
    try {
      const result = await refreshAccessToken(refreshToken.value);

      if (result.accessToken) {
        // Update cookies
        cookieStore.set(COOKIE_NAME, result.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: result.expiresIn || 36000,
        });

        if (result.newRefreshToken && result.newRefreshToken !== refreshToken.value) {
          cookieStore.set(REFRESH_COOKIE_NAME, result.newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: result.refreshExpiresIn || 60 * 60 * 24 * 7, // 7 days
          });
        }

        return result.accessToken;
      }

      return null;
    } finally {
      // Clean up lock
      refreshLocks.delete(lockKey);
    }
  })();

  refreshLocks.set(lockKey, refreshPromise);
  return await refreshPromise;
}
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(request, params, 'GET');
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(request, params, 'POST');
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(request, params, 'PUT');
}

export async function PATCH(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(request, params, 'PATCH');
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(request, params, 'DELETE');
}

async function handleRequest(request: NextRequest, params: { path: string[] }, method: string) {
  try {
    console.log(`📡 [${method}] Proxy request:`, params.path.join('/'));

    // Get valid access token (refresh if needed)
    const token = await getValidAccessToken();

    if (!token) {
      console.error('❌ Authentication failed - no valid token');
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      );
    }

    // Construct backend URL
    const path = params.path.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${BACKEND_URL}/${path}${searchParams ? `?${searchParams}` : ''}`;

    console.log(`🎯 Forwarding to backend:`, url);

    // Forward request to backend
    const headers: HeadersInit = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
      cache: 'no-store',
    };

    // Add body for POST/PUT/PATCH/DELETE
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const contentType = request.headers.get('Content-Type') || '';
      if (
        contentType.includes('multipart/form-data') ||
        contentType.includes('application/octet-stream')
      ) {
        options.body = request.body;

        (options as RequestInit & { duplex: 'half' }).duplex = 'half';

        headers['Content-Type'] = contentType;
      } else {
        try {
          const body = await request.json();
          options.body = JSON.stringify(body);
        } catch {
          // No body or invalid JSON
        }
      }
    }
    const response = await fetch(url, options);
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Proxy error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
