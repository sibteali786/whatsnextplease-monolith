import NotificationLayout from '@/components/layouts/NotificationLayout';
import Shell from '@/components/Shell';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ReactNode, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import RouteProgressBar from '@/components/RoutesProgressBar';
import { ChatProvider } from '../providers/ChatContextProvider';
import { NotificationPermissionProvider } from '@/components/notifications/notificationPermissionProvider';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { getCurrentUser } from '@/utils/user';

// Loading fallback component
const ShellSkeleton = () => (
  <div className="flex w-screen h-screen">
    <aside className="w-[280px] min-w-[280px] max-w-[280px] h-full border-r bg-muted">
      <Skeleton className="h-full w-full" />
    </aside>
    <div className="w-[calc(100vw-280px)] px-10 overflow-auto">
      <Skeleton className="h-16 w-full mt-6 rounded-full" />
      <div className="mt-16 h-full">
        <Skeleton className="h-[80vh] w-full rounded-xl" />
      </div>
    </div>
  </div>
);

const Dashboard = async ({ children }: { children: ReactNode }) => {
  // ✅ Fetch user data server-side
  const user = await getCurrentUser();

  return (
    <NotificationLayout>
      <Suspense fallback={<ShellSkeleton />}>
        <RouteProgressBar />
        <Shell>
          <TooltipProvider>
            <ChatProvider
              enableFloatingButton={true}
              floatingButtonConfig={{
                position: 'bottom-right',
                hideOnRoutes: ['/messages'],
                enableMinimize: true,
              }}
            >
              <NotificationPermissionProvider>
                {/* ✅ Show banner at the top of all dashboard content */}
                {user && !user.emailVerified && (
                  <div className="mb-4">
                    <EmailVerificationBanner email={user.email} />
                  </div>
                )}
                <div className="h-full">{children}</div>
              </NotificationPermissionProvider>
            </ChatProvider>
          </TooltipProvider>
        </Shell>
      </Suspense>
    </NotificationLayout>
  );
};

export default Dashboard;
