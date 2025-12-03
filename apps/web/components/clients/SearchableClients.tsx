'use client';

import React, { useEffect, useState, useRef } from 'react';
import { SearchableDropdown } from '../ui/searchable-dropdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserX } from 'lucide-react';
import { fetchClients } from '@/utils/clientActions';

interface ClientListItem {
  id: string;
  companyName: string | null;
  contactName: string | null;
  avatarUrl: string | null;
}

interface SearchableClientProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  search?: string;
  initialClient?: ClientListItem;
}

export function SearchableClient({
  value,
  onChange,
  disabled,
  search,
  initialClient: initialClientProp,
}: SearchableClientProps) {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [initialClient, setInitialClient] = useState<ClientListItem | null>(null);
  const hasFetchedOnce = useRef(false);
  // Add debugging
  console.log('SearchableClient render:', {
    value,
    search,
    initialClientProp,
    initialClient,
    clientsLength: clients.length,
    hasMore,
  });
  // -----------------------------
  // Fetch clients (cursor-based)
  // -----------------------------
  const fetchClientsLocally = async (
    cursor: string | null = null,
    search = '',
    isNewSearch = false
  ) => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetchClients(cursor, 5, search);
      const newClients: ClientListItem[] = res?.clients || [];

      setClients(prev => (isNewSearch ? newClients : [...prev, ...newClients]));
      setHasMore(res?.hasNextPage ?? false);
      setCursor(res?.nextCursor ?? null);

      if (isNewSearch && !initialClient && value && !initialClientProp) {
        const foundClient = newClients.find(c => c.id === value);
        if (foundClient) {
          setInitialClient(foundClient);
        }
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };
  // -----------------------------
  // Set initial client from prop
  // -----------------------------
  useEffect(() => {
    if (initialClientProp) {
      setInitialClient(initialClientProp);
    }
  }, [initialClientProp]);
  // -----------------------------
  // Initial fetch
  // -----------------------------
  useEffect(() => {
    if (!hasFetchedOnce.current) {
      if (search && value) {
        fetchClientsLocally(null, search, true);
      } else {
        fetchClientsLocally(null, '', true);
      }
      hasFetchedOnce.current = true;
    }
  }, []);
  useEffect(() => {
    if (search) {
      setSearchQuery(search);
    }
  }, [search]);
  const clientItems = React.useMemo(() => {
    const baseItems = clients.map(client => ({
      value: client.id,
      label: `${client.contactName} (${client.companyName})`,
      avatarUrl: client.avatarUrl,
      companyName: client.companyName,
      contactName: client.contactName,
    }));
    console.log('clientItems memo:', {
      value,
      valueExists: value && value !== 'none',
      initialClient,
      baseItemsLength: baseItems.length,
      exists: baseItems.some(item => item.value === value),
    });

    // If value is set but not in list, find it and add it
    if (value && value !== 'none') {
      const exists = baseItems.some(item => item.value === value);
      if (!exists && initialClient) {
        return [
          {
            value: initialClient.id,
            label: `${initialClient.contactName} (${initialClient.companyName})`,
            avatarUrl: initialClient.avatarUrl,
            companyName: initialClient.companyName,
            contactName: initialClient.contactName,
          },
          ...baseItems,
        ];
      }
    }

    return baseItems;
  }, [clients, value, initialClient]);
  console.log('Final items being passed to SearchableDropdown:', {
    totalItems: clientItems.length + 1, // +1 for "No Client"
    value: value || 'none',
    clientItems: clientItems.slice(0, 3), // First 3 for debugging
  });
  return (
    <SearchableDropdown<{
      value: string;
      label: string;
      avatarUrl: string | null;
      companyName: string | null;
      contactName: string | null;
    }>
      items={[
        {
          value: 'none',
          label: 'No Client',
          avatarUrl: null,
          companyName: '',
          contactName: '',
        },
        ...clientItems,
      ]}
      value={value || 'none'}
      onChange={v => onChange?.(v === 'none' ? '' : v)}
      placeholder="Select Client"
      disabled={disabled}
      searchQuery={search}
      onSearch={q => {
        setSearchQuery(q);
        setCursor(null);
        fetchClientsLocally(null, q, true); // new search → replace list
      }}
      onScrollEnd={() => {
        if (hasMore && !loading) {
          fetchClientsLocally(cursor, searchQuery); // fetch next cursor
        }
      }}
      renderOption={client =>
        client.value === 'none' ? (
          <div className="flex items-center gap-2">
            <UserX className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">No Client</span>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6 rounded-lg">
                <AvatarImage
                  src={client.avatarUrl || 'https://github.com/shadcn.png'}
                  alt={client.contactName ?? 'avatar'}
                  className="rounded-full"
                />
                <AvatarFallback className="rounded-full text-xs">
                  {client.contactName ? client.contactName.substring(0, 2).toUpperCase() : 'CL'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">
                {client.contactName} ({client.companyName})
              </span>
            </div>
          </div>
        )
      }
    />
  );
}
