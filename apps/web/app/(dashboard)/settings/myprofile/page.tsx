'use client';

import ProfileForm from '@/components/settings/ProfileForm';
import { COOKIE_NAME } from '@/utils/constant';
import { Roles } from '@prisma/client';
import { useEffect, useState } from 'react';
import { getCookie } from '@/utils/utils';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get token the same way as other pages
        const token = getCookie(COOKIE_NAME);

        // Get user info first to determine role
        const userResponse = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userData = await userResponse.json();
        setUser(userData);

        // Then get profile based on role
        const profileResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/${userData.role.name !== Roles.CLIENT ? 'user' : 'client'}/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!profileResponse.ok) {
          throw new Error('Failed to fetch profile');
        }

        const profileData = await profileResponse.json();
        setProfile(profileData);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  if (!profile || !user) return <div>Unable to load profile</div>;

  return <ProfileForm initialData={profile} token={getCookie(COOKIE_NAME) as string} user={user} />;
}
