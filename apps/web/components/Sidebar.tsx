'use client';

import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Settings,
  LayoutDashboard,
  Gamepad2,
  FolderClock,
  DollarSign,
  UserCheck,
  Menu,
  ChevronLeft,
} from 'lucide-react'; // Added UserCheck icon for Task Agents
import { ActiveMenu } from './ActiveMenu';
import { Roles } from '@prisma/client';
import { Logo } from './assets/Logo';
import { LinkButton } from './ui/LinkButton';
import { LogoutButton } from './auth/LogOutButton';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SideBarContext';
import { useTheme } from 'next-themes';

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
    { path: '/home', label: 'Home', Icon: Home },
    { path: '/skills', label: 'Skills', Icon: Gamepad2 },
    { path: '/users', label: 'Users', Icon: Users },
    { path: '/clients', label: 'Clients', Icon: LayoutDashboard },
    { path: '/taskAgents', label: 'Task Agents', Icon: UserCheck }, // Added Task Agents
    { path: '/settings', label: 'Settings', Icon: Settings },
  ],
  TASK_AGENT: [
    { path: '/home', label: 'Home', Icon: Home },
    { path: '/settings', label: 'Settings', Icon: Settings },
  ],
  CLIENT: [
    { path: '/home', label: 'Home', Icon: Home },
    { path: '/billing', label: 'Billing', Icon: DollarSign },
    { path: '/workhistory', label: 'Work History', Icon: FolderClock },
    { path: '/settings', label: 'Settings', Icon: Settings },
  ],
  TASK_SUPERVISOR: [
    { path: '/home', label: 'Home', Icon: Home },
    { path: '/taskAgents', label: 'Task Agents', Icon: UserCheck }, // Added Task Agents
    { path: '/clients', label: 'Clients', Icon: LayoutDashboard },
    { path: '/settings', label: 'Settings', Icon: Settings },
  ],
  // Add other roles as needed
};
const Sidebar = ({ role }: { role: Roles }) => {
  const { isCollapsed, setIsCollapsed, isMobile, setSheetOpen } = useSidebar();
  const pathname = usePathname();
  const { theme } = useTheme();
  const allowedLinks = ROLE_PERMISSIONS[role] || []; // Get allowed links for the user's role
  const handleNavigation = () => {
    // Close drawer on mobile when navigating
    if (isMobile) {
      setSheetOpen(false);
    }
  };
  return (
    <aside
      className={cn(
        'h-screen bg-white dark:bg-background flex flex-col justify-between transition-all duration-300',
        isMobile ? 'w-full border-none' : 'border-r',
        !isMobile && (isCollapsed ? 'w-20' : 'w-64')
      )}
    >
      <div>
        {/* Logo and Toggle Section */}
        <div
          className={cn(
            'flex items-center mb-8 px-7 py-6 transition-all duration-300',
            isCollapsed && !isMobile ? 'justify-center' : 'justify-between gap-2'
          )}
        >
          {(!isCollapsed || isMobile) && <Logo width={100} height={100} />}

          {/* Show toggle only on desktop */}
          {!isMobile && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <Menu className="w-5 h-5" />
              ) : (
                <ChevronLeft
                  className={`w-7 h-7 rounded-[6px] p-1 ${theme === 'dark' ? 'bg-primary' : 'bg-[#F3EFFB]'}`}
                />
              )}
            </button>
          )}
        </div>

        <hr className="my-4 mx-8" />

        {/* Links */}
        <nav className="flex flex-col items-center">
          {allowedLinks.map(({ path, label, Icon }) => (
            <div key={path} className="flex flex-row items-center w-full">
              <ActiveMenu
                pathname={path}
                activePath={pathname}
                isCollapsed={isCollapsed && !isMobile}
              />
              <LinkButton
                variant={'ghost'}
                size={'lg'}
                href={path}
                onClick={handleNavigation}
                className={cn(
                  'flex items-center gap-4 py-7 w-full transition-all duration-300',
                  isCollapsed && !isMobile ? 'justify-center px-4' : 'justify-start px-12',
                  pathname.startsWith(path) ? 'text-purple-600' : 'text-textPrimary'
                )}
                title={isCollapsed && !isMobile ? label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {(!isCollapsed || isMobile) && <p className="w-28">{label}</p>}
              </LinkButton>
            </div>
          ))}
        </nav>
      </div>

      {/* Logout Section */}
      <div className="mt-8 flex flex-col items-center">
        <LogoutButton />
      </div>
    </aside>
  );
};

export default Sidebar;
