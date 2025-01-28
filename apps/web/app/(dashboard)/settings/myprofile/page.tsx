// app/settings/myprofile/page.tsx
import ProfileForm from '@/components/settings/ProfileForm';
import { COOKIE_NAME } from '@/utils/constant';
import { cookies } from 'next/headers';

async function getProfile() {
  const token = cookies().get(COOKIE_NAME)?.value;
  const response = await fetch(`${process.env.API_URL}/user/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store', // or use revalidate if you want to cache for some time
  });

  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }

  return response.json();
}

export default async function ProfilePage() {
  const profile = await getProfile();
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return;
  return <ProfileForm initialData={profile} token={token} />;
}
