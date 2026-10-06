import { User, Role, Address } from '../../types';
import { mockCurrentUser, mockAddresses } from '../../data/mockData';

const getStoredUser = (): User => {
  try {
    const data = localStorage.getItem('rudin_current_user');
    if (data) return JSON.parse(data);
  } catch (e) {
    // Ignore
  }
  return mockCurrentUser;
};

const getStoredAddresses = (userId?: string): Address[] => {
  let addresses: Address[] = mockAddresses;

  try {
    const data = localStorage.getItem('rudin_addresses');
    if (data) addresses = JSON.parse(data) as Address[];
  } catch (e) {
    // Ignore malformed local storage and fall back to demo data.
  }

  return userId ? addresses.filter((address) => address.userId === userId) : addresses;
};

export const authService = {
  getCurrentUser: async (): Promise<User | null> => {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return getStoredUser();
  },

  login: async (email: string, _password: string, demoRole?: Role): Promise<User> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const user: User = {
      id: 'u1',
      email: email || 'alex.morgan@example.com',
      firstName: email.split('@')[0] || 'Alex',
      lastName: 'Morgan',
      role: demoRole || 'CUSTOMER',
      phone: '+1 (555) 234-5678',
      avatarUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200',
      createdAt: '2023-01-10T12:00:00Z',
    };
    localStorage.setItem('rudin_current_user', JSON.stringify(user));
    return user;
  },

  register: async (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role?: Role;
  }): Promise<User> => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const newUser: User = {
      id: `u_${Date.now()}`,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role || 'CUSTOMER',
      phone: data.phone || '+1 (555) 000-0000',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('rudin_current_user', JSON.stringify(newUser));
    return newUser;
  },

  logout: async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    localStorage.removeItem('rudin_current_user');
  },

  updateProfile: async (updates: Partial<User>): Promise<User> => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const current = getStoredUser();
    const updated = { ...current, ...updates };
    localStorage.setItem('rudin_current_user', JSON.stringify(updated));
    return updated;
  },

  getAddresses: async (userId?: string): Promise<Address[]> => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return getStoredAddresses(userId);
  },

  saveAddress: async (address: Omit<Address, 'id'> & { id?: string }): Promise<Address> => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const currentUser = getStoredUser();
    const allAddresses = getStoredAddresses();
    const userAddresses = allAddresses.filter((a) => a.userId === currentUser.id);
    let saved: Address;

    if (address.id) {
      const existing = userAddresses.find((a) => a.id === address.id);
      if (!existing) throw new Error('Address not found');

      saved = { ...existing, ...address, userId: currentUser.id } as Address;
      const index = allAddresses.findIndex((a) => a.id === address.id);
      allAddresses[index] = saved;
    } else {
      saved = {
        ...address,
        userId: currentUser.id,
        id: `addr_${Date.now()}`,
      };

      if (saved.isDefault) {
        allAddresses.forEach((a) => {
          if (a.userId === currentUser.id) a.isDefault = false;
        });
      }
      allAddresses.push(saved);
    }

    localStorage.setItem('rudin_addresses', JSON.stringify(allAddresses));
    return saved;
  },

  deleteAddress: async (addressId: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const currentUser = getStoredUser();
    const allAddresses = getStoredAddresses();
    const target = allAddresses.find((address) => address.id === addressId);

    if (!target || target.userId !== currentUser.id) return;

    const updated = allAddresses.filter((address) => address.id !== addressId);
    localStorage.setItem('rudin_addresses', JSON.stringify(updated));
  },
};
