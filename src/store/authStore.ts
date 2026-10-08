import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Role } from '../types';
import { mockCurrentUser } from '../data/mockData';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  loginAsDemo: (role: Role) => void;
  register: (userData: Omit<User, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => void;
  logout: () => void;
  setDemoRole: (role: Role) => void;
  updateUserProfile: (updates: Partial<User>) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Normal default state must start unauthenticated with no fake pre-authenticated session
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: (user) => set({ user, isAuthenticated: true, isLoading: false }),

      loginAsDemo: (role: Role) => {
        let demoUser: User;
        if (role === 'VENDOR') {
          demoUser = {
            id: 'u_v1',
            email: 'aether@rudinstore.com',
            firstName: 'Aether',
            lastName: 'Studio',
            role: 'VENDOR',
            avatarUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&q=80&w=200&h=200',
            createdAt: '2022-04-12T00:00:00Z'
          };
        } else if (role === 'ADMIN') {
          demoUser = {
            id: 'u_admin',
            email: 'admin@rudinstore.com',
            firstName: 'Platform',
            lastName: 'Admin',
            role: 'ADMIN',
            avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200&h=200',
            createdAt: '2021-01-01T00:00:00Z'
          };
        } else {
          demoUser = mockCurrentUser;
        }

        set({ user: demoUser, isAuthenticated: true, isLoading: false });
      },

      register: (userData) => {
        const newUser: User = {
          id: userData.id || `u_${Date.now()}`,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role || 'CUSTOMER',
          phone: userData.phone,
          avatarUrl: userData.avatarUrl || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200`,
          createdAt: userData.createdAt || new Date().toISOString()
        };
        set({ user: newUser, isAuthenticated: true, isLoading: false });
      },

      logout: () => set({ user: null, isAuthenticated: false, isLoading: false }),

      // Explicit development/demo utility for testing different role perspectives
      setDemoRole: (role: Role) =>
        set((state) => {
          if (!state.user) return state;
          return {
            user: { ...state.user, role }
          };
        }),

      updateUserProfile: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null
        })),

      setLoading: (isLoading) => set({ isLoading })
    }),
    {
      name: 'rudin-auth-storage'
    }
  )
);
