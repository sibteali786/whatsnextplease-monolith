import { DynamicBreadcrumb } from '@/components/skills/DynamicBreadcrumb';
import { ReactNode } from 'react';

interface TaskAgentLayoutProps {
  children: ReactNode;
  modal: ReactNode; // Parallel route slot
}

const TaskAgentLayout = async ({ children, modal }: TaskAgentLayoutProps) => {
  const breadcrumbLinks = [
    { label: 'Task Offerings' },
    // ...(selectedCategory ? [{ label: selectedCategory.categoryName }] : []),
  ];

  return (
    <div className="flex flex-col gap-8">
      <DynamicBreadcrumb links={breadcrumbLinks} />
      {/* Content */}
      {children}
      {/* Modal slot for parallel routes */}
      {modal}
    </div>
  );
};

export default TaskAgentLayout;
