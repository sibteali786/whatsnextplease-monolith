import ClientBillingList from '@/components/clients/ClientBillingList';
import ClientFileList from '@/components/clients/ClientFileList';
import ClientHistoryList from '@/components/clients/ClientHistoryList';
import { DynamicTabs, Tab } from '@/components/clients/ClientTabs';
import ClientTaskList from '@/components/clients/ClientTaskList';
import { DetailsCard } from '@/components/common/DetailsCard';
import { getClientById } from '@/utils/clientActions';
import { getCurrentUser } from '@/utils/user';
import { Roles } from '@prisma/client';

const ClientProfile = async ({ params }: { params: { clientId: string } }) => {
  const user = await getCurrentUser();

  const clientTabs: Tab[] = [
    {
      tabName: 'Tasks',
      tabValue: 'tasks',
      tabContent: (
        <ClientTaskList clientId={params.clientId} role={user?.role?.name ?? Roles.SUPER_USER} />
      ),
    },
    {
      tabName: 'Billing',
      tabValue: 'billing',
      tabContent: (
        <div>
          <ClientBillingList clientId={params.clientId} />
        </div>
      ),
    },
    {
      tabName: 'Files',
      tabValue: 'files',
      tabContent: <ClientFileList clientId={params.clientId} />,
    },
    {
      tabName: 'History',
      tabValue: 'history',
      tabContent: (
        <ClientHistoryList clientId={params.clientId} role={user?.role?.name ?? Roles.SUPER_USER} />
      ),
    },
  ];
  //FIXME: add personal loading.tsx for this so its has its own loading skeletons
  const { client, message } = await getClientById(params.clientId);

  return (
    <div className="flex flex-col gap-7">
      {client ? (
        <DetailsCard
          title={client.companyName}
          subTitle={client.contactName ?? ''}
          avatarUrl={client.avatarUrl}
          leftFields={[
            { label: 'Phone', value: client.phone },
            { label: 'Email', value: client.email },
            { label: 'City', value: client.city },
            { label: 'State', value: client.state },
            { label: 'Zip Code', value: client.zipCode },
          ]}
          rightFields={[
            {
              label: 'Address 1',
              value: client.address1,
            },
            {
              label: 'Address 2',
              value: client.address2 ?? '',
            },
          ]}
        />
      ) : (
        <p className="text-red-500">Error: {message}</p>
      )}
      <DynamicTabs tabs={clientTabs} defaultValue="tasks" />
    </div>
  );
};

export default ClientProfile;
