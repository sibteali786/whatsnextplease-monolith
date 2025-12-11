import { DataTable } from './data-table';

import { getAllClientIds } from '@/utils/clientActions';
import getClientsList from '@/db/repositories/clients/getClients';

const fetchClients = async (cursor: string | null, pageSize: number, search?: string) => {
  'use server';

  const { clients, nextCursor, totalCount } = await getClientsList({
    cursor: cursor,
    pageSize: pageSize, // Change page size as required
    search,
  });
  return { clients, nextCursor, totalCount };
};

export default async function ClientsPage() {
  const clientIds = await getAllClientIds();
  return (
    <div className="container mx-auto py-4">
      <DataTable fetchData={fetchClients} clientIds={clientIds} />
    </div>
  );
}
