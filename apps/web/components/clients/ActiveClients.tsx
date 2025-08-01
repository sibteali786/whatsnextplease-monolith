'use client';
import Link from 'next/link';
import { ActiveClientsChart } from '../chart/ActiveClientChart';
import { LabelValue } from '../LabelValue';
import { Card, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { ClientType } from '@/types';
import { CountLabel } from '../common/CountLabel';
import { useRouter } from 'next/navigation';
import { useClientStore } from '@/store/useClientStore';

interface ActiveClientsProps {
  error?: string;
  errorCount?: string;
  count: number;
  clients: ClientType[];
}

export const ActiveClients: React.FC<ActiveClientsProps> = ({
  error,
  errorCount,
  count,
  clients,
}) => {
  const router = useRouter();
  const { setSelectedClient } = useClientStore();
  const handleLinkClick = (client: ClientType) => {
    // This function can be used to handle any additional logic when a client link is clicked
    setSelectedClient({
      id: client.id,
      username: client.contactName,
    });
    // You can also set the selected client in a global state or context if needed
    router.push(`/clients/${client.id}`);
  };
  return (
    <Card className="p-6 rounded-2xl shadow-m">
      <div className="p-2 flex flex-row justify-between">
        {errorCount ? (
          <div className="flex flex-row justify-center">
            <p>{errorCount}</p>
          </div>
        ) : (
          <CountLabel
            lineHeight={'normal'}
            label={'Active Clients'}
            count={count}
            listOpacity={70}
            countSize="text-8xl"
          />
        )}
        <div className="my-4">
          <ActiveClientsChart />
          <div className="flex w-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="text-primary text-base font-semibold">15%</span>
            increase from last month{' '}
          </div>
        </div>
      </div>
      <CardContent>
        {error ? (
          <div className="flex flex-row justify-center">
            <p className="text-red-500 mt-4">{error}</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {clients.map(client => (
              <li
                key={client.id}
                className="flex justify-between items-center py-2 border-b last:border-0"
              >
                <div>
                  <h3 className="font-medium text-black dark:text-white text-lg">
                    {client.companyName}
                  </h3>
                  <LabelValue
                    className="text-muted-foreground"
                    label="Contact Name"
                    value={client.contactName}
                  />
                </div>
                <Button variant="link" onClick={() => handleLinkClick(client)}>
                  View Details
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter>
        {error ? null : (
          <Link href="/clients">
            <Button variant="link">View More</Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
};
