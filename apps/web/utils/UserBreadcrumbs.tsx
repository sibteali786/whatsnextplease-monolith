"use client";

import { DynamicBreadcrumb } from "../components/DynamicBreadcrumb";
import { usePathname } from "next/navigation";
import { useClientStore } from "@/store/useClientStore";

export const UserBreadCrumbs: React.FC = () => {
  const pathname = usePathname();
  const { selectedClient } = useClientStore();

  const breadcrumbLinks = [
    { href: "/users", label: "Users" },
    ...(pathname === "/users/adduser"
      ? [{ href: "/users/adduser", label: "Add User" }]
      : []),
    ...(selectedClient && pathname === `/users/${selectedClient?.id}`
      ? [
          {
            href: `/users/${selectedClient.id}`,
            label: selectedClient.username,
          },
        ]
      : []),
  ];
  //TODO: the selectedClient does not persist so need to save state in local storage.
  return <DynamicBreadcrumb links={breadcrumbLinks} />;
};
