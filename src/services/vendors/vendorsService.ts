import { Vendor, Product } from '../../types';
import { mockVendors, mockProducts } from '../../data/mockData';

const getStoredVendors = (): Vendor[] => {
  try {
    const data = localStorage.getItem('rudin_vendors');
    if (data) return JSON.parse(data);
  } catch (e) {
    // Ignore
  }
  return mockVendors;
};

const saveStoredVendors = (vendors: Vendor[]) => {
  try {
    localStorage.setItem('rudin_vendors', JSON.stringify(vendors));
  } catch (e) {
    // Ignore
  }
};

export const vendorsService = {
  getVendors: async (): Promise<Vendor[]> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return getStoredVendors();
  },

  getVendorById: async (id: string): Promise<Vendor | null> => {
    await new Promise(resolve => setTimeout(resolve, 80));
    return getStoredVendors().find(v => v.id === id) || null;
  },

  getVendorBySlug: async (slug: string): Promise<Vendor | null> => {
    await new Promise(resolve => setTimeout(resolve, 80));
    return getStoredVendors().find(v => v.slug === slug) || null;
  },

  getVendorProducts: async (vendorId: string): Promise<Product[]> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockProducts.filter(p => p.vendorId === vendorId);
  },

  searchVendors: async (query: string): Promise<Vendor[]> => {
    await new Promise(resolve => setTimeout(resolve, 80));
    const q = query.toLowerCase();
    return getStoredVendors().filter(v =>
      v.storeName.toLowerCase().includes(q) ||
      v.description.toLowerCase().includes(q) ||
      v.location.toLowerCase().includes(q)
    );
  },

  updateVendor: async (id: string, updates: Partial<Vendor>): Promise<Vendor | null> => {
    await new Promise(resolve => setTimeout(resolve, 120));
    const current = getStoredVendors();
    const idx = current.findIndex(v => v.id === id);
    if (idx === -1) return null;
    current[idx] = { ...current[idx], ...updates };
    saveStoredVendors(current);
    return current[idx];
  },

  toggleVendorVerification: async (id: string): Promise<Vendor | null> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const current = getStoredVendors();
    const idx = current.findIndex(v => v.id === id);
    if (idx === -1) return null;
    current[idx].isVerified = !current[idx].isVerified;
    saveStoredVendors(current);
    return current[idx];
  }
};
