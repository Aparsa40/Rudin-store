import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Coupon } from '../types';
import { mockProducts } from '../data/mockData';

const getAvailableStock = (productId: string, variantId?: string): number | null => {
  const product = mockProducts.find((item) => item.id === productId);
  if (!product) return null;
  return variantId
    ? (product.variants.find((variant) => variant.id === variantId)?.stockQuantity ?? 0)
    : product.stock;
};

interface CartState {
  items: CartItem[];
  saveForLater: CartItem[];
  appliedCoupon: Coupon | null;
  isDrawerOpen: boolean;

  addItem: (item: Omit<CartItem, 'id' | 'addedAt'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;

  moveToSaveForLater: (id: string) => void;
  moveToCartFromSaved: (id: string) => void;
  removeSavedItem: (id: string) => void;

  applyCoupon: (coupon: Coupon) => void;
  removeCoupon: () => void;

  openDrawer: () => void;
  closeDrawer: () => void;

  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      saveForLater: [],
      appliedCoupon: null,
      isDrawerOpen: false,

      addItem: (item) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => i.productId === item.productId && i.variantId === item.variantId,
          );

          const availableStock = getAvailableStock(item.productId, item.variantId);
          if (availableStock !== null && availableStock <= 0) {
            return state;
          }

          if (existingIndex >= 0) {
            const newItems = [...state.items];
            const requestedQuantity = newItems[existingIndex].quantity + item.quantity;
            newItems[existingIndex].quantity =
              availableStock === null
                ? requestedQuantity
                : Math.min(availableStock, requestedQuantity);
            return { items: newItems, isDrawerOpen: true };
          }

          const initialQuantity =
            availableStock === null ? item.quantity : Math.min(availableStock, item.quantity);

          return {
            items: [
              ...state.items,
              {
                ...item,
                quantity: Math.max(1, initialQuantity),
                id: `ci_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                addedAt: new Date().toISOString(),
              },
            ],
            isDrawerOpen: true,
          };
        });
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        }));
      },

      updateQuantity: (id, quantity) => {
        set((state) => ({
          items: state.items.map((i) => {
            if (i.id !== id) return i;
            const availableStock = getAvailableStock(i.productId, i.variantId);
            const nextQuantity = Math.max(1, quantity);
            return {
              ...i,
              quantity:
                availableStock === null ? nextQuantity : Math.min(availableStock, nextQuantity),
            };
          }),
        }));
      },

      clearCart: () => {
        set({ items: [], appliedCoupon: null });
      },

      moveToSaveForLater: (id) => {
        set((state) => {
          const item = state.items.find((i) => i.id === id);
          if (!item) return state;
          return {
            items: state.items.filter((i) => i.id !== id),
            saveForLater: [...state.saveForLater, item],
          };
        });
      },

      moveToCartFromSaved: (id) => {
        set((state) => {
          const item = state.saveForLater.find((i) => i.id === id);
          if (!item) return state;
          return {
            saveForLater: state.saveForLater.filter((i) => i.id !== id),
            items: [...state.items, item],
          };
        });
      },

      removeSavedItem: (id) => {
        set((state) => ({
          saveForLater: state.saveForLater.filter((i) => i.id !== id),
        }));
      },

      applyCoupon: (coupon) => {
        set({ appliedCoupon: coupon });
      },

      removeCoupon: () => {
        set({ appliedCoupon: null });
      },

      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),

      getItemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: 'rudin-cart-storage',
    },
  ),
);
