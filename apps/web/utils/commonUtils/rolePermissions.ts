// utils/permissions.ts

import { Roles } from '@prisma/client';

export const ROLE_PERMISSIONS: Record<Roles, string[]> = {
  [Roles.SUPER_USER]: ['/*'], // Full access including permissions page
  [Roles.TASK_AGENT]: ['/home', '/settings/myprofile', '/settings/notifications', '/taskOfferings'],
  [Roles.CLIENT]: ['/home', '/settings/myprofile', '/settings/notifications', '/settings/billing'],
  [Roles.DISTRICT_MANAGER]: [
    '/home',
    '/clients/:path*',
    '/settings/myprofile',
    '/settings/notifications',
  ],
  [Roles.TERRITORY_MANAGER]: [
    '/home',
    '/clients',
    '/settings/myprofile',
    '/settings/notifications',
  ],
  [Roles.ACCOUNT_EXECUTIVE]: [
    '/home',
    '/clients',
    '/skills',
    '/settings/myprofile',
    '/settings/notifications',
  ],
  [Roles.TASK_SUPERVISOR]: ['/home', '/settings/*', '/users/*'], // Can access all settings including permissions
};
