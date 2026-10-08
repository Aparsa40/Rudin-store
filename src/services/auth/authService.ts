import { User, Role, Address } from '../../types';
import { mockAddresses } from '../../data/mockData';

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

  login: async (email: string, _password: string, demoRole?: Role): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const user: User = {
      id: 'u1',
      email: email || 'alex.morgan@example.com',
      firstName: email.split('@')[0] || 'Alex',
      lastName: 'Morgan',
      role: demoRole || 'CUSTOMER',
      phone: '+1 (555) 234-5678',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200',
      createdAt: '2023-01-10T12:00:00Z'
    };
    return user;
  },

  register: async (data: { firstName: string; lastName: string; email: string; phone?: string; role?: Role }): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 250));
    const newUser: User = {
      id: `u_${Date.now()}`,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role || 'CUSTOMER',
      phone: data.phone || '+1 (555) 000-0000',
      createdAt: new Date().toISOString()
    };
    return newUser;
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
