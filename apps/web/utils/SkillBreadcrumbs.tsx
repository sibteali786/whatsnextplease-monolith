// components/SkillBreadcrumbs.tsx
"use client";

import { DynamicBreadcrumb } from "../components/DynamicBreadcrumb";

interface SkillBreadcrumbsProps {
  breadcrumbLinks: { href: string; label: string; onClick?: () => void }[];
}

export const SkillBreadcrumbs: React.FC<SkillBreadcrumbsProps> = ({
  breadcrumbLinks,
}) => {
  return <DynamicBreadcrumb links={breadcrumbLinks} />;
};
