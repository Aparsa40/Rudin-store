import { Category } from '../../types';
import { mockCategories } from '../../data/mockData';

export const categoriesService = {
  getCategories: async (): Promise<Category[]> => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return mockCategories;
  },

  getCategoryBySlug: async (slug: string): Promise<Category | null> => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return mockCategories.find((c) => c.slug === slug) || null;
  },

  getCategoryById: async (id: string): Promise<Category | null> => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return mockCategories.find((c) => c.id === id) || null;
  },

  getFeaturedCategories: async (): Promise<Category[]> => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return mockCategories.filter((c) => c.featured);
  },
};
