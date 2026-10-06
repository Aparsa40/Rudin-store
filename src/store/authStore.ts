import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Role } from '../types';
import { mockCurrentUser } from '../data/mockData';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  register: (
    userData: Omit<User, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
  ) => void;
  logout: () => void;
  updateUserRole: (role: Role) => void;
  updateUserProfile: (updates: Partial<User>) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: mockCurrentUser, // Pre-authenticated with mock customer
      isAuthenticated: true,
      isLoading: false,

      login: (user) => set({ user, isAuthenticated: true, isLoading: false }),
      register: (userData) => {
        const newUser: User = {
          id: userData.id || `u_${Date.now()}`,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role || 'CUSTOMER',
          phone: userData.phone,
          avatarUrl:
            userData.avatarUrl ||
            `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200`,
          createdAt: userData.createdAt || new Date().toISOString(),
        };
        set({ user: newUser, isAuthenticated: true, isLoading: false });
      },
      logout: () => set({ user: null, isAuthenticated: false, isLoading: false }),
      updateUserRole: (role: Role) =>
        set((state) => ({
          user: state.user ? { ...state.user, role } : null,
        })),
      updateUserProfile: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'rudin-auth-storage',
    },
  ),
);
