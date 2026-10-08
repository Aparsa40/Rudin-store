import { create } from 'zustand';
import { Product } from '../types';

export interface Toast {
  id: string;
  type: 'success' | 'info' | 'error' | 'warning';
  message: string;
  duration?: number;
}

interface UIState {
  quickViewProduct: Product | null;
  openQuickView: (product: Product) => void;
  closeQuickView: () => void;

  toasts: Toast[];
  addToast: (message: string, type?: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  quickViewProduct: null,
  openQuickView: (product) => set({ quickViewProduct: product }),
  closeQuickView: () => set({ quickViewProduct: null }),

  toasts: [],
  addToast: (message, type = 'success', duration = 3000) => {
    const id = `t_${Date.now()}_${Math.random()}`;
    set((state) => ({
      toasts: [...state.toasts, { id, type, message, duration }]
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id)
        }));
      }, duration);
    }
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }))
}));
