import { Product, ProductFilterParams } from '../../types';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

type ProductResponse = { product: Product };
type ProductsResponse = { products: Product[]; pagination?: { total?: number } };

async function readApiResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || 'The product request could not be completed.';
    throw new Error(message);
  }
  return payload as T;
}

function toProduct(value: Product): Product {
  const product = value as Product & { _id?: string };
  return {
    ...product,
    id: product.id || product._id || '',
    images: Array.isArray(product.images) ? product.images : [],
    variants: Array.isArray(product.variants) ? product.variants : [],
    tags: Array.isArray(product.tags) ? product.tags : [],
    features: Array.isArray(product.features) ? product.features : [],
    specifications: product.specifications || {},
    rating: Number(product.rating || 0),
    reviewCount: Number(product.reviewCount || 0),
    stock: Number(product.stock || 0),
  };
}

async function fetchProducts(params: URLSearchParams): Promise<{ products: Product[]; total: number }> {
  const response = await fetch(`${API_BASE_URL}/api/products?${params.toString()}`);
  const payload = await readApiResponse<ProductsResponse>(response);
  const products = (payload.products || []).map(toProduct);
  return { products, total: payload.pagination?.total ?? products.length };
}

async function fetchProductsByFlag(flag: 'featured' | 'bestSeller' | 'newArrival' | 'flashDeal', limit: number): Promise<Product[]> {
  const params = new URLSearchParams({ [flag]: 'true', limit: String(limit), sortBy: flag === 'featured' ? 'featured' : 'newest' });
  return (await fetchProducts(params)).products;
}

export const productsService = {
  getProducts: async (filters: ProductFilterParams = {}): Promise<{ products: Product[]; total: number }> => {
    const params = new URLSearchParams();
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.vendorId) params.set('vendorId', filters.vendorId);
    if (filters.brandId) params.set('brandId', filters.brandId);
    if (filters.searchQuery?.trim()) params.set('q', filters.searchQuery.trim());
    if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
    if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
    if (filters.minRating !== undefined) params.set('minRating', String(filters.minRating));
    if (filters.inStockOnly) params.set('inStockOnly', 'true');
    if (filters.onSaleOnly) params.set('onSaleOnly', 'true');
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    params.set('page', String(filters.page || 1));
    params.set('limit', String(filters.limit || 12));
    return fetchProducts(params);
  },

  getProductBySlug: async (slug: string): Promise<Product | null> => {
    const response = await fetch(`${API_BASE_URL}/api/products/${encodeURIComponent(slug)}`);
    if (response.status === 404) return null;
    const payload = await readApiResponse<ProductResponse>(response);
    return toProduct(payload.product);
  },

  getProductById: async (id: string): Promise<Product | null> => {
    const response = await fetch(`${API_BASE_URL}/api/products/${encodeURIComponent(id)}`);
    if (response.status === 404) return null;
    const payload = await readApiResponse<ProductResponse>(response);
    return toProduct(payload.product);
  },

  getProductsByCategory: async (categoryId: string): Promise<Product[]> =>
    (await fetchProducts(new URLSearchParams({ categoryId, limit: '100', sortBy: 'featured' }))).products,

  getProductsByVendor: async (vendorId: string): Promise<Product[]> =>
    (await fetchProducts(new URLSearchParams({ vendorId, limit: '100', sortBy: 'newest' }))).products,

  getFeaturedProducts: async (limit = 4): Promise<Product[]> => fetchProductsByFlag('featured', limit),
  getBestSellers: async (limit = 4): Promise<Product[]> => fetchProductsByFlag('bestSeller', limit),
  getNewArrivals: async (limit = 4): Promise<Product[]> => fetchProductsByFlag('newArrival', limit),
  getFlashDeals: async (): Promise<Product[]> => fetchProductsByFlag('flashDeal', 100),

  getRelatedProducts: async (productId: string, limit = 4): Promise<Product[]> => {
    const target = await productsService.getProductById(productId);
    if (!target) return [];
    const pageSize = Math.min(100, limit + 1);
    const byCategory = (await productsService.getProducts({ categoryId: target.categoryId, limit: pageSize })).products;
    const related = byCategory.filter((product) => product.id !== target.id);
    if (related.length >= limit) return related.slice(0, limit);
    const byVendor = (await productsService.getProducts({ vendorId: target.vendorId, limit: pageSize })).products;
    for (const product of byVendor) {
      if (product.id !== target.id && !related.some((existing) => existing.id === product.id)) related.push(product);
      if (related.length >= limit) break;
    }
    return related.slice(0, limit);
  },

  // Co-purchase data requires an order-item backend relation that is not implemented yet.
  getFrequentlyBoughtTogether: async (_productId: string): Promise<Product[]> => [],

  searchSuggestions: async (query: string): Promise<{
    products: { id: string; title: string; slug: string; price: number; image: string }[];
    categories: { id: string; name: string; slug: string }[];
    popular: string[];
  }> => {
    const q = query.trim();
    if (!q) return { products: [], categories: [], popular: [] };
    const { products } = await fetchProducts(new URLSearchParams({ q, limit: '4', sortBy: 'featured' }));
    return {
      products: products.map((product) => ({
        id: product.id,
        title: product.title,
        slug: product.slug,
        price: product.price,
        image: product.images?.[0]?.url || '',
      })),
      categories: [],
      popular: [],
    };
  },
};
