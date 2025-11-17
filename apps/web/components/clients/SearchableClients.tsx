'use client';

import React, { useEffect, useState, useRef } from 'react';
import { SearchableDropdown } from '../ui/searchable-dropdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserX } from 'lucide-react';
import { fetchClients } from '@/utils/clientActions';

interface ClientListItem {
  id: string;
  username: string;
  companyName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  avatarUrl: string | null;
}

interface SearchableClientProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  search?: string;
}

export function SearchableClient({ value, onChange, disabled, search }: SearchableClientProps) {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const hasFetchedOnce = useRef(false);
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
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // Initial fetch
  // -----------------------------
  useEffect(() => {
    if (!hasFetchedOnce.current) {
      fetchClientsLocally(null, '', true);
      hasFetchedOnce.current = true;
    }
  }, []);
  useEffect(() => {
    if (!search) return;
    setCursor(null);
    fetchClientsLocally(null, search, true); // new search → replace list
  }, [search]);
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
        ...clients.map(client => ({
          value: client.id,
          label: client.contactName + ' ' + `(${client.companyName})`,
          avatarUrl: client.avatarUrl,
          companyName: client.companyName,
          contactName: client.contactName,
        })),
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
