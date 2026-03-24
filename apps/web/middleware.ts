// /middleware.ts
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { COOKIE_NAME } from './utils/constant';
import { ROLE_PERMISSIONS } from './utils/commonUtils/rolePermissions';
import { Roles } from '@prisma/client';

const decodeJWT = (token: string) => {
  try {
    const base64Url = token.split('.')[1]; // Extract the payload part
    const base64 = base64Url?.replace(/-/g, '+').replace(/_/g, '/') ?? ''; // Replace URL-safe characters
    const decodedPayload = JSON.parse(atob(base64)); // Decode base64 payload
    return decodedPayload;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
};

/**
 * Extract role from token payload
 * Handles both legacy JWT and IDP tokens (Keycloak/Cognito)
 */
const extractRole = (payload: any): Roles | null => {
  // Legacy JWT format: { id, username, role: "SUPER_USER" }
  if (payload.role && typeof payload.role === 'string') {
    return payload.role as Roles;
  }

  // Keycloak format: { realm_access: { roles: ["WnpInternalUsers", "..."] } }
  // Cognito format: { "cognito:groups": ["WnpInternalUsers"] }
  const groups: string[] =
    payload.realm_access?.roles || payload['cognito:groups'] || payload.groups || [];

  // Map IDP groups to roles
  if (groups.includes('WnpExternalClients')) {
    return Roles.CLIENT;
  }

  // For internal users, we need to check the database
  // But for now, default to TASK_AGENT for WnpInternalUsers
  if (groups.includes('WnpInternalUsers')) {
    // TODO: We can't determine exact role from IDP token alone
    // Options:
    // 1. Default to TASK_AGENT (safest, least permissions)
    // 2. Make an API call to backend to get user role
    // 3. Store role in custom claims in IDP

    // For now, let's allow access and let protected routes handle specifics
    return Roles.TASK_AGENT; // Default to least privileged internal role
  }

  return null;
};

export function middleware(request: NextRequest) {
  const isEmbeddedContext =
    request.nextUrl.searchParams.has('modal') ||
    request.nextUrl.searchParams.has('embedded') ||
    request.headers.get('sec-fetch-dest') === 'iframe' ||
    (request.headers.get('sec-fetch-mode') === 'navigate' &&
      request.headers.get('sec-fetch-site') === 'cross-site');

  if (isEmbeddedContext) {
    return NextResponse.next();
  }

  // Check if the required cookie is missing
  const token = request.cookies.get(COOKIE_NAME);
  if (!token) {
    // Redirect to /signin if not authenticated
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/home', request.url));
  }
  if (request.nextUrl.pathname === '/settings') {
    return NextResponse.redirect(new URL('/settings/myprofile', request.url));
  }

  // Decode the JWT to get the user role
  const payload = decodeJWT(token.value);

  if (!payload) {
    console.error('Failed to decode token');
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  // Extract role (works with both legacy and IDP tokens)
  const userRole = extractRole(payload);

  if (!userRole) {
    console.error('Could not extract role from token:', payload);
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  const pathname = request.nextUrl.pathname;

  // Lookup permissions by role
  const allowedRoutes = ROLE_PERMISSIONS[userRole] || [];

  if (!ROLE_PERMISSIONS[userRole]) {
    console.warn(`Role ${userRole} has no defined permissions.`);
  }

  const isRouteAllowed = allowedRoutes.some(route => {
    const routeRegex = new RegExp(`^${route.replace(/:\w+/g, '\\w+').replace('/*', '.*')}$`);
    return routeRegex.test(pathname);
  });

  if (!isRouteAllowed) {
    console.warn(`User with role ${userRole} tried to access unauthorized route: ${pathname}`);
    return NextResponse.redirect(new URL('/home', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/clients/:path*',
    '/clients',
    '/settings/:path*',
    '/settings',
    '/skills/:path*',
    '/skills',
    '/',
  ],
};
