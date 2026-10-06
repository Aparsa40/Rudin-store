import { Product, ProductFilterParams } from '../../types';
import { mockProducts } from '../../data/mockData';

export const productsService = {
  getProducts: async (
    filters: ProductFilterParams = {},
  ): Promise<{ products: Product[]; total: number }> => {
    await new Promise((resolve) => setTimeout(resolve, 250));

    let results = [...mockProducts];

    if (filters.categoryId) {
      results = results.filter((p) => p.categoryId === filters.categoryId);
    }
    if (filters.categorySlug) {
      // Find matching category
      // We will match in categoriesService or by direct filter
    }
    if (filters.vendorId) {
      results = results.filter((p) => p.vendorId === filters.vendorId);
    }
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      results = results.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q) ||
          p.brandName?.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (filters.minPrice !== undefined) {
      results = results.filter((p) => p.price >= (filters.minPrice || 0));
    }
    if (filters.maxPrice !== undefined) {
      results = results.filter((p) => p.price <= (filters.maxPrice || Infinity));
    }
    if (filters.minRating !== undefined) {
      results = results.filter((p) => p.rating >= (filters.minRating || 0));
    }
    if (filters.inStockOnly) {
      results = results.filter((p) => p.stock > 0);
    }
    if (filters.onSaleOnly) {
      results = results.filter((p) => p.compareAtPrice && p.compareAtPrice > p.price);
    }

    // Sorting
    switch (filters.sortBy) {
      case 'price-asc':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        results.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'featured':
      default:
        results.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
        break;
    }

    const total = results.length;
    const page = filters.page || 1;
    const limit = filters.limit || 12;
    const startIndex = (page - 1) * limit;
    const paginatedProducts = results.slice(startIndex, startIndex + limit);

    return {
      products: paginatedProducts,
      total,
    };
  },

  getProductBySlug: async (slug: string): Promise<Product | null> => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return mockProducts.find((p) => p.slug === slug) || null;
  },

  getProductById: async (id: string): Promise<Product | null> => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return mockProducts.find((p) => p.id === id) || null;
  },

  getProductsByCategory: async (categoryId: string): Promise<Product[]> => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockProducts.filter((p) => p.categoryId === categoryId);
  },

  getProductsByVendor: async (vendorId: string): Promise<Product[]> => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockProducts.filter((p) => p.vendorId === vendorId);
  },

  getFeaturedProducts: async (limit = 4): Promise<Product[]> => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return mockProducts.filter((p) => p.isFeatured).slice(0, limit);
  },

  getBestSellers: async (limit = 4): Promise<Product[]> => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return mockProducts.filter((p) => p.isBestSeller).slice(0, limit);
  },

  getNewArrivals: async (limit = 4): Promise<Product[]> => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return mockProducts.filter((p) => p.isNewArrival).slice(0, limit);
  },

  getFlashDeals: async (): Promise<Product[]> => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return mockProducts.filter((p) => p.isFlashDeal);
  },

  getRelatedProducts: async (productId: string, limit = 4): Promise<Product[]> => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const target = mockProducts.find((p) => p.id === productId);
    if (!target) return [];
    return mockProducts
      .filter(
        (p) =>
          p.id !== productId &&
          (p.categoryId === target.categoryId || p.vendorId === target.vendorId),
      )
      .slice(0, limit);
  },

  getFrequentlyBoughtTogether: async (productId: string): Promise<Product[]> => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return mockProducts.filter((p) => p.id !== productId).slice(0, 2);
  },

  searchSuggestions: async (
    query: string,
  ): Promise<{
    products: { id: string; title: string; slug: string; price: number; image: string }[];
    categories: { id: string; name: string; slug: string }[];
    popular: string[];
  }> => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const q = query.toLowerCase().trim();
    if (!q) {
      return {
        products: [],
        categories: [],
        popular: [
          'Wireless Headphones',
          'Selvedge Denim',
          'Pour-Over Coffee',
          'Leather Wallet',
          'Studio Monitor',
        ],
      };
    }

    const matchedProducts = mockProducts
      .filter(
        (p) => p.title.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)),
      )
      .slice(0, 4)
      .map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        price: p.price,
        image: p.images[0]?.url || '',
      }));

    return {
      products: matchedProducts,
      categories: [],
      popular: ['Wireless Headphones', 'Selvedge Denim', 'Pour-Over Coffee', 'Leather Wallet'],
    };
  },
};
