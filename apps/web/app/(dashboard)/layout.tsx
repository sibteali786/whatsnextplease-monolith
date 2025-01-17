import NotificationLayout from '@/components/layouts/NotificationLayout';
import Shell from '@/components/Shell';
import { ReactNode } from 'react';
const Dashboard = ({ children }: { children: ReactNode }) => {
  return (
    <NotificationLayout>
      <Shell>
        <div className="h-full">{children}</div>
      </Shell>
    </NotificationLayout>
  );
};
export default Dashboard;
