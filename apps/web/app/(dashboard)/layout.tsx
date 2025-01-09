import Shell from "@/components/Shell";
import { ReactNode } from "react";
const Dashboard = ({ children }: { children: ReactNode }) => {
  return (
    <Shell>
      <div className="h-full">{children}</div>
    </Shell>
  );
};
export default Dashboard;
