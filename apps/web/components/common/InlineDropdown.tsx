'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

interface InlineDropdownProps<T> {
  value: T;
  options: { value: T; label: string; className?: string }[];
  onSelect: (value: T) => Promise<void>;
  displayValue: string;
  currentClassName?: string;
  isLoading?: boolean;
}

export function InlineDropdown<T extends string>({
  value,
  options,
  onSelect,
  displayValue,
  currentClassName = '',
  isLoading = false,
}: InlineDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = async (newValue: T) => {
    if (newValue !== value && !isLoading) {
      await onSelect(newValue);
    }
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <div className="cursor-pointer group">
          <Badge
            className={`${currentClassName} py-1 px-3 text-nowrap hover:opacity-80 transition-all duration-200 pr-6 group-hover:pr-8 relative`}
          >
            {displayValue}
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 ease-out" />
          </Badge>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[150px]">
        {options.map(option => (
          <DropdownMenuItem
            key={option.value}
            onClick={e => {
              e.stopPropagation();
              handleSelect(option.value);
            }}
            className="cursor-pointer"
            disabled={isLoading || option.value === value}
          >
            <Badge className={`${option.className || ''} py-1 px-3 text-xs`}>{option.label}</Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
