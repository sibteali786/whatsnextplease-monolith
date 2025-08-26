// components/settings/ProfileForm/index.tsx
'use client';

import { Roles } from '@prisma/client';
import { ClientWithRole, ProfileFormProps, UserWithRole } from './types';
import ProfileFormUser from './ProfileFormUser';
import { ProfileFormClient } from './ProfileFormClient';
import { UserSkillsSection } from '../skills/UserSkillsSection';

export default function ProfileForm({ initialData, token, user }: ProfileFormProps) {
  if (user?.role?.name === Roles.CLIENT) {
    return <ProfileFormClient initialData={initialData as ClientWithRole} token={token} />;
  }

  return (
    <div className="space-y-6">
      <ProfileFormUser initialData={initialData as UserWithRole} token={token} />
      {user?.id && <UserSkillsSection userId={user.id} />}
    </div>
  );
}
