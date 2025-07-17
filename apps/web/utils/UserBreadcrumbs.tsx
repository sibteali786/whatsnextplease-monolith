'use client';

import { DynamicBreadcrumb } from '../components/DynamicBreadcrumb';
import { usePathname } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';

export const UserBreadCrumbs: React.FC = () => {
  const pathname = usePathname();
  const { selectedUser } = useUserStore();

  const breadcrumbLinks = [
    { href: '/users', label: 'Users' },
    ...(pathname === '/users/adduser' ? [{ href: '/users/adduser', label: 'Add User' }] : []),
    ...(selectedUser && pathname === `/users/${selectedUser?.id}`
      ? [
          {
            href: `/users/${selectedUser.id}`,
            label: selectedUser.name || selectedUser.id || 'User Details',
          },
        ]
      : []),
  ];
  //TODO: the selectedUser does not persist so need to save state in local storage.
  return <DynamicBreadcrumb links={breadcrumbLinks} />;
};
