import { ReactNode } from "react";
import { UserBreadCrumbs } from "@/utils/UserBreadcrumbs";
const UsersLayout = async ({ children }: { children: ReactNode }) => {
  return (
    <>
      <div className="flex flex-row justify-between mb-5">
        <UserBreadCrumbs />
      </div>
      {/* Content */}
      {children}
    </>
  );
};

export default UsersLayout;
