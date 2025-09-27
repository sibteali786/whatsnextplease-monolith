'use client';

import { UserCircle2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';
export default function ProfileBanner() {
  const router = useRouter();
  const handleUpdateProfile = () => {
    router.push('/settings/myprofile');
  };
  return (
    <Card className="h-[70px] rounded-2xl p-2 px-3 shadow-m flex mx-4 items-center justify-between profile-banner">
      <div className="flex items-center gap-3">
        <div className="rounded-xl p-2 border-2 border-primary">
          <UserCircle2 className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-col gap-1">
          <h2 className="text-lg font-semibold"> Finish Your Profile</h2>
          <p className="text-sm text-muted-foreground">
            Please update your profile to ensure a seamless integration with our system.
          </p>
        </div>
      </div>
      <Button onClick={handleUpdateProfile}>Update Profile</Button>
    </Card>
  );
}
