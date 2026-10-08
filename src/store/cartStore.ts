import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Coupon } from '../types';
import { cartService } from '../services/cart/cartService';

export interface CartActionResult {
  success: boolean;
  error?: string;
}

interface CartState {
  items: CartItem[];
  saveForLater: CartItem[];
  appliedCoupon: Coupon | null;
  isDrawerOpen: boolean;

  addItem: (item: Omit<CartItem, 'id' | 'addedAt'>) => CartActionResult;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => CartActionResult;
  clearCart: () => void;

  moveToSaveForLater: (id: string) => void;
  moveToCartFromSaved: (id: string) => CartActionResult;
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
        const stock = cartService.getAvailableStock(item.productId, item.variantId);
        const state = get();
        const existingIndex = state.items.findIndex(
          (i) => i.productId === item.productId && i.variantId === item.variantId
        );
        const currentQty = existingIndex >= 0 ? state.items[existingIndex].quantity : 0;
        const targetQty = currentQty + item.quantity;

        if (stock <= 0) {
          return {
            success: false,
            error: 'This item is currently out of stock.'
          };
        }

        if (targetQty > stock) {
          return {
            success: false,
            error: `Only ${stock} unit${stock === 1 ? '' : 's'} available in stock.`
          };
        }

        set((state) => {
          if (existingIndex >= 0) {
            const newItems = [...state.items];
            newItems[existingIndex].quantity = targetQty;
            return { items: newItems, isDrawerOpen: true };
          }

          return {
            items: [
              ...state.items,
              {
                ...item,
                id: `ci_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                addedAt: new Date().toISOString()
              }
            ],
            isDrawerOpen: true
          };
        });

        return { success: true };
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== id)
        }));
      },

      updateQuantity: (id, quantity) => {
        const state = get();
        const targetItem = state.items.find((i) => i.id === id);
        if (!targetItem) {
          return { success: false, error: 'Item not found in cart.' };
        }

        const stock = cartService.getAvailableStock(targetItem.productId, targetItem.variantId);

        if (quantity > stock) {
          // Clamp to maximum stock
          set((curr) => ({
            items: curr.items.map((i) =>
              i.id === id ? { ...i, quantity: stock } : i
            )
          }));
          return {
            success: false,
            error: `Only ${stock} unit${stock === 1 ? '' : 's'} available in stock.`
          };
        }

        const safeQuantity = Math.max(1, quantity);
        set((curr) => ({
          items: curr.items.map((i) =>
            i.id === id ? { ...i, quantity: safeQuantity } : i
          )
        }));

        return { success: true };
      },

      clearCart: () => {
        set({ items: [], appliedCoupon: null });
      },

      moveToSaveForLater: (id) => {
        set((state) => {
          const item = state.items.find(i => i.id === id);
          if (!item) return state;
          return {
            items: state.items.filter(i => i.id !== id),
            saveForLater: [...state.saveForLater, item]
          };
        });
      },

      moveToCartFromSaved: (id) => {
        const state = get();
        const item = state.saveForLater.find(i => i.id === id);
        if (!item) return { success: false, error: 'Item not found in saved list.' };

        const stock = cartService.getAvailableStock(item.productId, item.variantId);
        if (stock <= 0) {
          return { success: false, error: 'This item is currently out of stock.' };
        }

        set((curr) => ({
          saveForLater: curr.saveForLater.filter(i => i.id !== id),
          items: [...curr.items, { ...item, quantity: Math.min(item.quantity, stock) }]
        }));

        return { success: true };
      },

      removeSavedItem: (id) => {
        set((state) => ({
          saveForLater: state.saveForLater.filter((i) => i.id !== id)
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
        const items = get().items;
        return items.reduce((acc, item) => acc + item.quantity, 0);
      }
    }),
    {
      name: 'rudin-cart-storage'
    }
  )
);
