import { ReactNode } from 'react';

interface TaskAgentLayoutProps {
  children: ReactNode;
  modal: ReactNode; // Parallel route slot
}

const TaskAgentLayout = async ({ children, modal }: TaskAgentLayoutProps) => {
  return (
    <div className="flex flex-col gap-8">
      {/* Content */}
      {children}
      {/* Modal slot for parallel routes */}
      {modal}
    </div>
  );
};

export default TaskAgentLayout;
