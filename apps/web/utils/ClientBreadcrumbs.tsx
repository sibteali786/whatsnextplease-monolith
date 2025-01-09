"use client";

import { DynamicBreadcrumb } from "../components/DynamicBreadcrumb";
import { usePathname } from "next/navigation";
import { useClientStore } from "@/store/useClientStore";

export const ClientBreadCrumbs: React.FC = () => {
  const pathname = usePathname();
  const { selectedClient } = useClientStore();

  const breadcrumbLinks = [
    { href: "/clients", label: "Clients" },
    ...(pathname === "/clients/addclient"
      ? [{ href: "/clients/addclient", label: "Add Client" }]
      : []),
    ...(selectedClient && pathname === `/clients/${selectedClient?.id}`
      ? [
          {
            href: `/clients/${selectedClient.id}`,
            label: selectedClient.username,
          },
        ]
      : []),
  ];
  //TODO: the selectedClient does not persist so need to save state in local storage.
  return <DynamicBreadcrumb links={breadcrumbLinks} />;
};
