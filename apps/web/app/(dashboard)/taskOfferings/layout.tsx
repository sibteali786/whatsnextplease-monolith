import { DynamicBreadcrumb } from "@/components/skills/DynamicBreadcrumb";
import { ReactNode } from "react";
const TaskAgentLayout = async ({ children }: { children: ReactNode }) => {
  const breadcrumbLinks = [
    { label: "Task Offerings" },
    // ...(selectedCategory ? [{ label: selectedCategory.categoryName }] : []),
  ];

  return (
    <div className="flex flex-col gap-8">
      <DynamicBreadcrumb links={breadcrumbLinks} />
      {/* Content */}
      {children}
    </div>
  );
};

export default TaskAgentLayout;
