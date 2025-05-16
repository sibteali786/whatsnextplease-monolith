import { DataTable } from './data-table';
import Search from '@/components/Search';
import { PlusCircle } from 'lucide-react';
import { getAllClientIds } from '@/utils/clientActions';
import getClientsList from '@/db/repositories/clients/getClients';
import { LinkButton } from '@/components/ui/LinkButton';

const fetchClients = async (cursor: string | null, pageSize: number) => {
  'use server';

  const { clients, nextCursor, totalCount } = await getClientsList({
    cursor: cursor,
    pageSize: pageSize, // Change page size as required
  });
  return { clients, nextCursor, totalCount };
};

export default async function ClientsPage() {
  const clientIds = await getAllClientIds();
  return (
    <div className="container mx-auto py-4">
      <div className="flex flex-row justify-between items-center">
        <Search placeholder="Search titles" />

        <LinkButton href="clients/addclient" prefetch={true} className="gap-2">
          <PlusCircle />
          Add Client
        </LinkButton>
      </div>

      <DataTable fetchData={fetchClients} clientIds={clientIds} />
    </div>
  );
}
