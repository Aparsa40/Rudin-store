import { Product, Vendor, Category } from '../types';
import { mockProducts, mockVendors, mockCategories } from '../data/mockData';

export const productsService = {
  getProducts: async (): Promise<Product[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockProducts;
  },

  getProductById: async (id: string): Promise<Product | null> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockProducts.find(p => p.id === id) || null;
  },

  getProductBySlug: async (slug: string): Promise<Product | null> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockProducts.find(p => p.slug === slug) || null;
  },

  getProductsByCategory: async (categoryId: string): Promise<Product[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    return mockProducts.filter(p => p.categoryId === categoryId);
  },

  getProductsByVendor: async (vendorId: string): Promise<Product[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    return mockProducts.filter(p => p.vendorId === vendorId);
  },

  searchProducts: async (query: string): Promise<Product[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const lowerQuery = query.toLowerCase();
    return mockProducts.filter(p => 
      p.title.toLowerCase().includes(lowerQuery) || 
      p.description.toLowerCase().includes(lowerQuery) ||
      p.tags.some(t => t.toLowerCase().includes(lowerQuery))
    );
  }
};

export const vendorService = {
  getVendors: async (): Promise<Vendor[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockVendors;
  },

  getVendorById: async (id: string): Promise<Vendor | null> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockVendors.find(v => v.id === id) || null;
  },
  
  getVendorBySlug: async (slug: string): Promise<Vendor | null> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockVendors.find(v => v.slug === slug) || null;
  }
};

export const categoryService = {
  getCategories: async (): Promise<Category[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockCategories;
  },
  
  getCategoryBySlug: async (slug: string): Promise<Category | null> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockCategories.find(c => c.slug === slug) || null;
  }
};
