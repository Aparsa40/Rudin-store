import { mockProducts } from '../../data/mockData';
import { Product } from '../../types';

export const wishlistService = {
  getWishlistProducts: async (productIds: string[]): Promise<Product[]> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockProducts.filter(p => productIds.includes(p.id));
  }
};
