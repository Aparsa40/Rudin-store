import { User, Role, Address } from '../../types';
import { mockAddresses } from '../../data/mockData';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

interface ApiUser {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  role: Role;
  createdAt?: string;
}

async function readApiResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || 'The request could not be completed.';
    throw new Error(message);
  }
  return payload as T;
}

function mapApiUser(user: ApiUser): User {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName || '',
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt || new Date().toISOString()
  };
}

const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem('rudin-auth-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state?.user) return parsed.state.user;
    }
  } catch (e) {
    // Ignore
  }
  return null;
};

const getStoredAddresses = (): Address[] => {
  try {
    const data = localStorage.getItem('rudin_addresses');
    if (data) return JSON.parse(data);
  } catch (e) {
    // Ignore
  }
  return mockAddresses;
};

export const authService = {
  getCurrentUser: async (): Promise<User | null> => {
    await new Promise(resolve => setTimeout(resolve, 50));
    return getStoredUser();
  },

  login: async (email: string, password: string): Promise<{ user: User; accessToken: string }> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const payload = await readApiResponse<{ user: ApiUser; accessToken: string }>(response);
    if (!payload.accessToken) throw new Error('The API did not return an access token.');
    return { user: mapApiUser(payload.user), accessToken: payload.accessToken };
  },

  register: async (data: { firstName: string; lastName: string; email: string; password: string; phone?: string }): Promise<{ user: User; accessToken: string }> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const payload = await readApiResponse<{ user: ApiUser; accessToken: string }>(response);
    if (!payload.accessToken) throw new Error('The API did not return an access token.');
    return { user: mapApiUser(payload.user), accessToken: payload.accessToken };
  },

  logout: async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 50));
  },

  updateProfile: async (updates: Partial<User>): Promise<User | null> => {
    await new Promise(resolve => setTimeout(resolve, 150));
    const current = getStoredUser();
    if (!current) return null;
    return { ...current, ...updates };
  },

  getAddresses: async (): Promise<Address[]> => {
    await new Promise(resolve => setTimeout(resolve, 60));
    return getStoredAddresses();
  },

  saveAddress: async (address: Omit<Address, 'id'> & { id?: string }): Promise<Address> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const current = getStoredAddresses();
    let saved: Address;

    if (address.id) {
      saved = address as Address;
      const idx = current.findIndex(a => a.id === address.id);
      if (idx !== -1) current[idx] = saved;
    } else {
      saved = {
        ...address,
        id: `addr_${Date.now()}`
      };
      if (saved.isDefault) {
        current.forEach(a => { a.isDefault = false; });
      }
      current.push(saved);
    }

    localStorage.setItem('rudin_addresses', JSON.stringify(current));
    return saved;
  },

  deleteAddress: async (addressId: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 80));
    const current = getStoredAddresses().filter(a => a.id !== addressId);
    localStorage.setItem('rudin_addresses', JSON.stringify(current));
  }
};
