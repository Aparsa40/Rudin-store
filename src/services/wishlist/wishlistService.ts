import { Product } from '../../types';
import { productsService } from '../products/productsService';

export const wishlistService = {
  // Resolves wishlist entries against the live catalog API. Deleted, unpublished,
  // draft, and archived products return 404 and are skipped safely.
  getWishlistProducts: async (productIds: string[]): Promise<Product[]> => {
    const results = await Promise.allSettled(
      productIds.map((id) => productsService.getProductById(id))
    );
    return results.flatMap((result) =>
      result.status === 'fulfilled' && result.value ? [result.value] : []
    );
  }
};
