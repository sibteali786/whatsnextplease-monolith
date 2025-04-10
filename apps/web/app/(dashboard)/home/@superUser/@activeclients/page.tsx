import { ActiveClients } from '@/components/clients/ActiveClients';
import { getActiveClientCount } from '@/db/repositories/clients/getActiveClientCount';
import { getActiveClients } from '@/db/repositories/clients/getActiveClients';
import { getCurrentUser } from '@/utils/user';
import { Roles } from '@prisma/client';

export default async function ClientsSection() {
  const user = await getCurrentUser();
  if (user?.role?.name !== Roles.SUPER_USER) {
    return null;
  }
  const { clients, errorCode } = await getActiveClients();
  const { count, errorCode: errorCodeCount } = await getActiveClientCount();

  return (
    <ActiveClients
      error={errorCode}
      errorCount={errorCodeCount}
      clients={clients ?? []}
      count={count ?? 0}
    />
  );
}
