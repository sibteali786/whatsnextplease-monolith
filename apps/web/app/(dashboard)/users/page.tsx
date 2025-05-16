import Search from '@/components/Search';
import { getUserIds } from '@/utils/userTools';
import { PlusCircle } from 'lucide-react';
import { DataTable } from './data-table';
import getUsers from '@/db/repositories/users/getUsers';
import { LinkButton } from '@/components/ui/LinkButton';

const fetchUsers = async (cursor: string | null, pageSize: number) => {
  'use server';

  const { users, nextCursor, totalCount } = await getUsers({
    cursor: cursor,
    pageSize: pageSize, // Change page size as required
  });
  return { users, nextCursor, totalCount };
};

export default async function Users() {
  const userIds = await getUserIds();
  return (
    <div className="container mx-auto py-4">
      <div className="flex flex-row justify-between items-center">
        <Search placeholder="Search titles" />
        <LinkButton className="gap-2" href="users/adduser" prefetch={true}>
          <PlusCircle />
          Add User
        </LinkButton>
      </div>
      <DataTable fetchData={fetchUsers} userIds={userIds} />
    </div>
  );
}
