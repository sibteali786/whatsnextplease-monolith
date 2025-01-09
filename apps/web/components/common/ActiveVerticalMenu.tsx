"use client";
import { usePathname } from "next/navigation";

export const ActiveVerticalMenu = ({ activePath }: { activePath: string }) => {
  const pathname = usePathname();
  if (pathname.startsWith(activePath)) {
    return (
      <div className="h-2 bg-purple-600 relative top-[-7px] w-full border-t-4 border-purple-600 rounded-t-md rotate-180"></div>
    );
  }
  return;
};
