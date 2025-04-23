'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'destructive';
  }
>(({ className, variant = 'primary', sideOffset = 4, ...props }, ref) => {
  // Define variant styles for the tooltip
  const variantStyles = {
    default: 'bg-popover text-popover-foreground',
    primary: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    success: 'bg-success text-success-foreground',
    warning: 'bg-warning text-warning-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
  };

  return (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 overflow-visible py-2 px-4 text-base font-medium shadow-lg',
        'rounded-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        variantStyles[variant],
        // Add speech bubble pointer based on side
        "after:content-[''] after:absolute after:h-4 after:w-4 after:rotate-45",
        'data-[side=bottom]:after:top-[-6px] data-[side=bottom]:after:left-1/2 data-[side=bottom]:after:ml-[-6px]',
        'data-[side=top]:after:bottom-[-6px] data-[side=top]:after:left-1/2 data-[side=top]:after:ml-[-6px]',
        'data-[side=left]:after:right-[-6px] data-[side=left]:after:top-1/2 data-[side=left]:after:mt-[-6px]',
        'data-[side=right]:after:left-[-6px] data-[side=right]:after:top-1/2 data-[side=right]:after:mt-[-6px]',
        // Pointer inherits background color
        'data-[side=bottom]:after:bg-inherit data-[side=top]:after:bg-inherit data-[side=left]:after:bg-inherit data-[side=right]:after:bg-inherit',
        className
      )}
      {...props}
    />
  );
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// Export example component for easy use
const CustomTooltip = ({
  children,
  content,
  variant = 'primary',
  side = 'top',
  align = 'center',
  delayDuration = 300,
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'destructive';
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
}) => (
  <TooltipProvider>
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent variant={variant} side={side} align={align}>
        {content}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export { CustomTooltip, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
