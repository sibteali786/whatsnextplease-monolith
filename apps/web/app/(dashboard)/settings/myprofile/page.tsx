'use client';

import ProfileForm from '@/components/settings/ProfileForm';
import { COOKIE_NAME } from '@/utils/constant';
import { Roles } from '@prisma/client';
import { useEffect, useState } from 'react';
import { getCookie } from '@/utils/utils';
import { getCurrentUser, UserState } from '@/utils/user';
import { apiClient } from '@/lib/apiClient';
import {
  ClientProfileType,
  GetClientProfileResponse,
  GetUserProfileResponse,
  UserProfileType,
} from '@/types/tasks/api-response';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfileType | ClientProfileType | undefined>(
    undefined
  );
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserState | null>(null);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userInfo = await getCurrentUser();
        setUser(userInfo);
        // Then get profile based on role

        const profileResponse = await apiClient.get<
          GetUserProfileResponse | GetClientProfileResponse
        >(`/${userInfo?.role?.name !== Roles.CLIENT ? 'user' : 'client'}/profile`);

        if (!profileResponse.success) {
          throw new Error('Failed to fetch profile');
        }
        setProfile(profileResponse.data);
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
