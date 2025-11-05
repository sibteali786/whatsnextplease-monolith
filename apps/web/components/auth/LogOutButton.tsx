// components/LogoutButton.tsx
'use client';

import { Button } from '@/components/ui/button';
import { signout } from '@/utils/user';
import { LogOut } from 'lucide-react';
import React from 'react';

export function LogoutButton() {
  const handleLogout = async () => {
    // Clear client-side storage first
    localStorage.clear();
    sessionStorage.clear();

    // Then call server action
    await signout();
  };

  return (
    <Button
      onClick={handleLogout}
      variant="ghost"
      className={`flex items-center gap-3 text-textPrimary`}
    >
      <LogOut className="w-5 h-5" />
      Log Out
    </Button>
  );
}
