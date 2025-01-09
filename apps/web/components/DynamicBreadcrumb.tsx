"use client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import { Fragment } from "react";

type BreadcrumbLinkItem = {
  href: string;
  label: string;
};

type DynamicBreadcrumbProps = {
  links: BreadcrumbLinkItem[];
};

export const DynamicBreadcrumb: React.FC<DynamicBreadcrumbProps> = ({
  links,
}) => {
  return (
    <Breadcrumb className="hidden md:flex">
      <BreadcrumbList>
        {links.map((link, index) => (
          <Fragment key={index}>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  href={link.href}
                  className={`text-xl font-bold ${
                    index === links.length - 1
                      ? "text-black dark:text-primary-foreground"
                      : "text-textPrimary"
                  }`}
                >
                  {link.label}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {/* Add separator only between items */}
            {index < links.length - 1 && <BreadcrumbSeparator />}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
