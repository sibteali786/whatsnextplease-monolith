// components/LogoutButton.tsx
'use client';

import { Button } from '@/components/ui/button';
import { handleLogout } from '@/utils/auth/logout';
import { LogOut } from 'lucide-react';
import React from 'react';

export function LogoutButton() {
  return (
    <Button
      onClick={() => handleLogout('User initiated logout')}
      variant="ghost"
      className={`flex items-center gap-3 text-textPrimary`}
    >
      <LogOut className="w-5 h-5" />
      Log Out
    </Button>
  );
}
