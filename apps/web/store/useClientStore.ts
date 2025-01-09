import { create } from "zustand";
interface ClientState {
  selectedClient: { id: string; username: string } | null;
  setSelectedClient: (client: { id: string; username: string }) => void;
  clearSelectedClient: () => void;
}

export const useClientStore = create<ClientState>((set) => ({
  selectedClient: null,
  setSelectedClient: (client) => set({ selectedClient: client }),
  clearSelectedClient: () => set({ selectedClient: null }),
}));
