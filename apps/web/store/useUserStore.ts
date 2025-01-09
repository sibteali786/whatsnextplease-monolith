import { User } from "@prisma/client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// UserState Store with persistence
interface UserState {
  selectedUser: { id: string; name: string } | null;
  setSelectedUser: (user: { id: string; name: string }) => void;
  clearSelectedUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      selectedUser: null,
      setSelectedUser: (user) => set({ selectedUser: user }),
      clearSelectedUser: () => set({ selectedUser: null }),
    }),
    {
      name: "user-store", // Key in localStorage
    },
  ),
);

// LoggedInUserState Store with persistence
type LoggedInUser = Omit<User, "passwordHash">;

interface LoggedInUserState {
  user: LoggedInUser | null;
  setUser: (user: LoggedInUser) => void;
  clearUser: () => void;
}

export const useLoggedInUserState = create<LoggedInUserState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: "logged-in-user-store", // Key in localStorage
    },
  ),
);
