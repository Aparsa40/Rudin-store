import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistState {
  productIds: string[];
  toggleWishlist: (productId: string) => boolean; // returns true if added, false if removed
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  getCount: () => number;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      productIds: ['p1', 'p3'], // Default initial favorites

      toggleWishlist: (productId: string) => {
        const { productIds } = get();
        const exists = productIds.includes(productId);
        if (exists) {
          set({ productIds: productIds.filter((id) => id !== productId) });
          return false;
        } else {
          set({ productIds: [...productIds, productId] });
          return true;
        }
      },

      isInWishlist: (productId: string) => {
        return get().productIds.includes(productId);
      },

      clearWishlist: () => set({ productIds: [] }),

      getCount: () => get().productIds.length,
    }),
    {
      name: 'rudin-wishlist-storage',
    },
  ),
);
