// utils/permissions.ts

import { Roles } from "@prisma/client";

export const ROLE_PERMISSIONS: Record<Roles, string[]> = {
  [Roles.SUPER_USER]: ["/*"], // Full access
  [Roles.TASK_AGENT]: ["/home", "/settings", "/taskOfferings"],
  [Roles.CLIENT]: ["/home", "/settings", "/workhistory", "/billing"],
  [Roles.DISTRICT_MANAGER]: ["/home", "/clients/:path*", "/settings"],
  [Roles.TERRITORY_MANAGER]: ["/home", "/clients", "/settings"],
  [Roles.ACCOUNT_EXECUTIVE]: ["/home", "/clients", "/skills", "/settings"],
  [Roles.TASK_SUPERVISOR]: ["/home", "/settings"], // Define as needed
};
