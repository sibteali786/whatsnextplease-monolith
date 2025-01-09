import { LucideIcon } from "lucide-react";
import Image from "next/image";
import { Button } from "./ui/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const stateVariants = cva(
  "flex flex-col items-center justify-center min-h-[400px] p-6 text-center",
  {
    variants: {
      variant: {
        default: "",
        success: "text-success",
        info: "text-info",
        warning: "text-warning",
        destructive: "text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const iconVariants = cva("h-12 w-12 mb-4", {
  variants: {
    variant: {
      default: "text-muted-foreground",
      success: "text-success",
      info: "text-info",
      warning: "text-warning",
      destructive: "text-destructive",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface StateProps extends VariantProps<typeof stateVariants> {
  icon?: LucideIcon;
  imageSrc?: string;
  imageAlt?: string;
  title: string;
  description: string;
  ctaText?: string;
  onCtaClick?: () => void;
  className?: string;
}

export const State = ({
  icon: Icon,
  imageSrc,
  imageAlt,
  title,
  description,
  ctaText,
  onCtaClick,
  variant,
  className,
}: StateProps) => {
  return (
    <div className={cn(stateVariants({ variant, className }))}>
      {Icon && <Icon className={cn(iconVariants({ variant }))} />}
      {imageSrc && (
        <div className="relative h-32 w-32 mb-4">
          <Image
            src={imageSrc}
            alt={imageAlt || "State illustration"}
            fill
            className="object-contain"
          />
        </div>
      )}
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      {ctaText && onCtaClick && (
        <Button
          onClick={onCtaClick}
          variant={variant === "default" ? "outline" : variant}
        >
          {ctaText}
        </Button>
      )}
    </div>
  );
};

export type { StateProps };
