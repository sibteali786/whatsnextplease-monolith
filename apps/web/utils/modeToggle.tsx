'use client';
import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface ModeToggle {
  className?: string;
}
export const ModeToggle: React.FC<ModeToggle> = ({ className }) => {
  const { setTheme, theme } = useTheme();
  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="flex items-center justify-center" variant="outline" size="icon">
            {theme === 'dark' ? (
              <Moon
                className=" rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
                size={20}
              />
            ) : (
              <Sun
                className=" text-black rotate-0 scale-100 transition-all dark:-rotate-90 "
                size={20}
              />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
