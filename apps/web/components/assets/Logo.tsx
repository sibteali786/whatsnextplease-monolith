import Image from "next/image";
import logoDark from "@/public/darkLogo.svg";
import logoLight from "@/public/lightLogo.svg";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { Skeleton } from "../ui/skeleton";

export const Logo = ({ width, height }: { width: number; height: number }) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure the component is mounted before rendering the logo
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Skeleton className="w-[100px] h-[70px]" />; // Prevent rendering until the theme is resolved
  }

  return (
    <div>
      <Image
        src={resolvedTheme === "dark" ? logoDark : logoLight}
        width={width}
        height={height}
        alt="logo"
      />
    </div>
  );
};
