import NotificationLayout from '@/components/layouts/NotificationLayout';
import Shell from '@/components/Shell';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ReactNode } from 'react';
const Dashboard = ({ children }: { children: ReactNode }) => {
  return (
    <NotificationLayout>
      <Shell>
        <TooltipProvider>
          <div className="h-full">{children}</div>
        </TooltipProvider>
      </Shell>
    </NotificationLayout>
  );
};
export default Dashboard;
