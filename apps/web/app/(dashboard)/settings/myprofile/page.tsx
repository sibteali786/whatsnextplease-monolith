// app/settings/myprofile/page.tsx
import ProfileForm from '@/components/settings/ProfileForm';
import { COOKIE_NAME } from '@/utils/constant';
import { getCurrentUser } from '@/utils/user';
import { Roles } from '@prisma/client';
import { cookies } from 'next/headers';

async function getProfile(role: Roles | undefined) {
  const token = cookies().get(COOKIE_NAME)?.value;
  const response = await fetch(
    `${process.env.API_URL}/${role !== Roles.CLIENT ? 'user' : 'client'}/profile`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // or use revalidate if you want to cache for some time
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }

  return response.json();
}

export default async function ProfilePage() {
  const token = cookies().get(COOKIE_NAME)?.value;
  const user = await getCurrentUser();
  const profile = await getProfile(user.role.name);
  if (!token) return;
  return <ProfileForm initialData={profile} token={token} user={user} />;
}
