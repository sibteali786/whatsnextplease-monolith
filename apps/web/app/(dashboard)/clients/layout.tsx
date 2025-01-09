import { ReactNode } from "react";
import { ClientBreadCrumbs } from "@/utils/ClientBreadcrumbs";
const ClientsLayout = async ({ children }: { children: ReactNode }) => {
  return (
    <>
      <div className="flex flex-row justify-between mb-5">
        <ClientBreadCrumbs />
      </div>
      {/* Content */}
      {children}
    </>
  );
};

export default ClientsLayout;
