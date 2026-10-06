import { Vendor, Product } from '../../types';
import { mockVendors, mockProducts } from '../../data/mockData';

export const vendorsService = {
  getVendors: async (): Promise<Vendor[]> => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return mockVendors;
  },

  getVendorById: async (id: string): Promise<Vendor | null> => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return mockVendors.find((v) => v.id === id) || null;
  },

  getVendorBySlug: async (slug: string): Promise<Vendor | null> => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return mockVendors.find((v) => v.slug === slug) || null;
  },

  getVendorProducts: async (vendorId: string): Promise<Product[]> => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return mockProducts.filter((p) => p.vendorId === vendorId);
  },

  searchVendors: async (query: string): Promise<Vendor[]> => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const q = query.toLowerCase();
    return mockVendors.filter(
      (v) =>
        v.storeName.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.location.toLowerCase().includes(q),
    );
  },
};
