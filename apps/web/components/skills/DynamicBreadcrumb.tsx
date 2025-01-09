// components/DynamicBreadcrumb.tsx
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Fragment } from "react";

interface DynamicBreadcrumbProps {
  links: { label: string; onClick?: () => void }[];
}

export const DynamicBreadcrumb: React.FC<DynamicBreadcrumbProps> = ({
  links,
}) => {
  return (
    <Breadcrumb className="hidden md:flex">
      <BreadcrumbList>
        {links.map((link, index) => (
          <Fragment key={index}>
            <BreadcrumbItem>
              <BreadcrumbLink className="text-2xl" onClick={link.onClick}>
                {link.label}
              </BreadcrumbLink>
            </BreadcrumbItem>
            {index < links.length - 1 && <BreadcrumbSeparator />}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
