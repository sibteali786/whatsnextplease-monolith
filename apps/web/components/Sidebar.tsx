"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Settings,
  LogOut,
  LayoutDashboard,
  Gamepad2,
  FolderClock,
  DollarSign,
} from "lucide-react"; // Icons from lucide-react
import { ActiveMenu } from "./ActiveMenu";
import { Button } from "./ui/button";
import { signout } from "@/utils/user";
import { Roles } from "@prisma/client";
import { Logo } from "./assets/Logo";

// Define role-based permissions for sidebar links
const ROLE_PERMISSIONS: Record<
  string,
  {
    path: string;
    label: string;
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  }[]
> = {
  SUPER_USER: [
    { path: "/home", label: "Home", Icon: Home },
    { path: "/skills", label: "Skills", Icon: Gamepad2 },
    { path: "/users", label: "Users", Icon: Users },
    { path: "/clients", label: "Clients", Icon: LayoutDashboard },
    { path: "/settings", label: "Settings", Icon: Settings },
  ],
  TASK_AGENT: [
    { path: "/home", label: "Home", Icon: Home },
    { path: "/settings", label: "Settings", Icon: Settings },
  ],
  CLIENT: [
    { path: "/home", label: "Home", Icon: Home },
    { path: "/billing", label: "Billing", Icon: DollarSign },
    { path: "/workhistory", label: "Work History", Icon: FolderClock },
    { path: "/settings", label: "Settings", Icon: Settings },
  ],
  TASK_SUPERVISOR: [
    { path: "/home", label: "Home", Icon: Home },
    { path: "/settings", label: "Settings", Icon: Settings },
  ],
  // Add other roles as needed
};
const Sidebar = ({ role }: { role: Roles }) => {
  const pathname = usePathname();
  const allowedLinks = ROLE_PERMISSIONS[role] || []; // Get allowed links for the user's role

  const commonProperties =
    "flex items-center justify-center gap-4 py-7 px-12 w-full";
  const commonItemDivClasses = "flex flex-row items-center w-full";

  return (
    <aside className="w-full h-ful bg-white dark:bg-background border-r flex flex-col justify-between h-screen">
      <div>
        <div className="flex items-center justify-center gap-2 mb-8 px-7 py-6">
          <Logo width={100} height={100} />
        </div>
        <hr className="my-4 mx-8" />
        {/* Links */}
        <nav className="flex flex-col items-center ">
          {allowedLinks.map(({ path, label, Icon }) => (
            <div key={path} className={commonItemDivClasses}>
              <ActiveMenu pathname={path} activePath={pathname} />
              <Link
                href={path}
                className={`${commonProperties} ${
                  pathname.startsWith(path)
                    ? "text-purple-600"
                    : "text-textPrimary"
                }`}
              >
                <Icon className="w-5 h-5" />
                <p className="w-28">{label}</p>
              </Link>
            </div>
          ))}
        </nav>
      </div>

      {/* Logout Section */}
      <div className="mt-8 flex flex-col items-center">
        <Button
          className={`flex items-center gap-3 text-textPrimary ${commonProperties}`}
          onClick={() => signout()}
          variant="ghost"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
