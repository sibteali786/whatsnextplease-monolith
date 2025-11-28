'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SerialNumberBadgeProps {
  serialNumber: string | undefined;
  showCopy?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
  className?: string;
}

export function SerialNumberBadge({
  serialNumber,
  showCopy = true,
  size = 'md',
  variant = 'default',
  className,
}: SerialNumberBadgeProps) {
  const [copied, setCopied] = useState(false);

  if (!serialNumber) {
    return (
      <Badge variant="outline" className={cn('font-mono', className)}>
        Draft
      </Badge>
    );
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(serialNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy serial number:', error);
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <div className="flex items-center gap-1">
      <Badge variant={variant} className={cn('font-mono', sizeClasses[size], className)}>
        {serialNumber}
      </Badge>

      {showCopy && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCopy}
                aria-label="Copy serial number"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{copied ? 'Copied!' : 'Copy serial number'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
