import { Vendor, Product } from '../../types';
import { mockVendors } from '../../data/mockData';
import { productsService } from '../products/productsService';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

interface ApiVendor {
  id: string;
  userId?: string;
  storeName: string;
  slug: string;
  description?: string;
  createdAt?: string;
}

async function readApiResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || 'The vendor request could not be completed.';
    throw new Error(message);
  }
  return payload as T;
}

// The backend exposes public vendor fields only. UI-only fields fall back to
// neutral defaults instead of fabricated demo data.
function toVendor(v: ApiVendor): Vendor {
  return {
    id: v.id,
    userId: v.userId ?? v.id,
    storeName: v.storeName,
    slug: v.slug,
    description: v.description ?? '',
    logoUrl: '',
    bannerUrl: '',
    rating: 0,
    reviewCount: 0,
    followerCount: 0,
    isVerified: false,
    responseTime: '',
    policies: { shipping: '', returns: '', processingTime: '' },
    location: '',
    categories: [],
    createdAt: v.createdAt ?? new Date().toISOString(),
  };
}

// Local demo helpers kept for the admin vendor-management UI, which has no
// backend API yet. They never touch real catalog data.
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
    const response = await fetch(`${API_BASE_URL}/api/vendors`);
    const payload = await readApiResponse<{ vendors: ApiVendor[] }>(response);
    return (payload.vendors || []).map(toVendor);
  },

  getVendorById: async (id: string): Promise<Vendor | null> => {
    const response = await fetch(`${API_BASE_URL}/api/vendors/${encodeURIComponent(id)}`);
    if (response.status === 404) return null;
    const payload = await readApiResponse<{ vendor: ApiVendor }>(response);
    return toVendor(payload.vendor);
  },

  getVendorBySlug: async (slug: string): Promise<Vendor | null> => {
    const response = await fetch(`${API_BASE_URL}/api/vendors?slug=${encodeURIComponent(slug)}`);
    const payload = await readApiResponse<{ vendors: ApiVendor[] }>(response);
    const match = (payload.vendors || []).find((v) => v.slug === slug);
    return match ? toVendor(match) : null;
  },

  getVendorProducts: async (vendorId: string): Promise<Product[]> =>
    productsService.getProductsByVendor(vendorId),

  searchVendors: async (query: string): Promise<Vendor[]> => {
    const vendors = await vendorsService.getVendors();
    const q = query.toLowerCase();
    return vendors.filter(
      (v) => v.storeName.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)
    );
  },

  // Local demo helpers (no backend API exists for these yet).
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
