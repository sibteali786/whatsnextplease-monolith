// /middleware.ts
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { COOKIE_NAME } from "./utils/constant";
import { ROLE_PERMISSIONS } from "./utils/commonUtils/rolePermissions";
import { Roles } from "@prisma/client";

const decodeJWT = (token: string) => {
  try {
    const base64Url = token.split(".")[1]; // Extract the payload part
    const base64 = base64Url?.replace(/-/g, "+").replace(/_/g, "/") ?? ""; // Replace URL-safe characters
    const decodedPayload = JSON.parse(atob(base64)); // Decode base64 payload
    return decodedPayload;
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
};

export function middleware(request: NextRequest) {
  // Check if the required cookie is missing
  const token = request.cookies.get(COOKIE_NAME);
  if (!token) {
    // Redirect to /signin if not authenticated
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // Decode the JWT to get the user role
  const payload = decodeJWT(token.value);

  if (!payload || !payload.role) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }
  const pathname = request.nextUrl.pathname;
  // Default to empty array if role is not defined
  const userRoleString = payload.role as keyof typeof Roles;
  // Assuming payload.role is guaranteed to be one of the enum's string values
  const userRole = Roles[userRoleString]; // Now userRole is Roles.SUPER_USER, etc.

  // Lookup permissions by enum
  const allowedRoutes = ROLE_PERMISSIONS[userRole] || [];
  if (!ROLE_PERMISSIONS[userRole]) {
    console.warn(`Role ${userRole} has no defined permissions.`);
  }
  const isRouteAllowed = allowedRoutes.some((route) => {
    const routeRegex = new RegExp(
      `^${route.replace(/:\w+/g, "\\w+").replace("/*", ".*")}$`,
    );
    return routeRegex.test(pathname);
  });

  if (!isRouteAllowed) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/clients/:path*", // Protect all paths under /clients
    "/clients", // Protect the /clients root path
    "/settings/:path*", // Example for other paths, you can add more
    "/settings", // Protect the /settings root path
    "/skills/:path*", // Protect skills
    "/skills", // Protect the /skills root path
    "/",
  ],
};
