import { getUserIds } from '@/utils/userTools';
import { DataTable } from './data-table';
import getUsers from '@/db/repositories/users/getUsers';

const fetchUsers = async (cursor: string | null, pageSize: number, search?: string) => {
  'use server';

  const { users, nextCursor, totalCount } = await getUsers({
    cursor: cursor,
    pageSize: pageSize, // Change page size as required
    search,
  });
  return { users, nextCursor, totalCount };
};

export default async function Users() {
  const userIds = await getUserIds();

  return (
    <div className="container mx-auto py-4">
      <DataTable fetchData={fetchUsers} userIds={userIds} />
    </div>
  );
}
