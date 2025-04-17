import { Client, Roles } from '@prisma/client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
interface SelectedClientState {
  selectedClient: { id: string; username: string } | null;
  setSelectedClient: (client: { id: string; username: string }) => void;
  clearSelectedClient: () => void;
}

export const useClientStore = create<SelectedClientState>(set => ({
  selectedClient: null,
  setSelectedClient: client => set({ selectedClient: client }),
  clearSelectedClient: () => set({ selectedClient: null }),
}));

type LoggedInClient = Omit<Client, 'passwordHash'> & {
  role: {
    name: Roles | undefined;
  } | null;
};

interface LoggedInClientState {
  client: LoggedInClient | null;
  setClient: (client: LoggedInClient) => void;
  clearClient: () => void;
}

export const useLoggedInClientState = create<LoggedInClientState>()(
  persist(
    set => ({
      client: null,
      setClient: client => set({ client }),
      clearClient: () => set({ client: null }),
    }),
    {
      name: 'logged-in-client-store', // Key in localStorage
    }
  )
);
