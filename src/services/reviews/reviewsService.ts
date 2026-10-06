import { Review, RatingBreakdown } from '../../types';
import { mockReviews } from '../../data/mockData';

const getStoredReviews = (): Review[] => {
  try {
    const data = localStorage.getItem('rudin_reviews');
    if (data) return JSON.parse(data);
  } catch (e) {
    // Ignore
  }
  return mockReviews;
};

const saveStoredReviews = (reviews: Review[]) => {
  try {
    localStorage.setItem('rudin_reviews', JSON.stringify(reviews));
  } catch (e) {
    // Ignore
  }
};

export const reviewsService = {
  getProductReviews: async (productId: string): Promise<Review[]> => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const all = getStoredReviews();
    return all.filter((r) => r.productId === productId);
  },

  getRatingBreakdown: async (productId: string): Promise<RatingBreakdown> => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const all = getStoredReviews();
    const productReviews = all.filter((r) => r.productId === productId);

    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    productReviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating)));
      counts[star] = (counts[star] || 0) + 1;
    });

    const totalReviews = productReviews.length;
    const percentages: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    let sum = 0;
    if (totalReviews > 0) {
      for (let star = 1; star <= 5; star++) {
        percentages[star] = Math.round(((counts[star] || 0) / totalReviews) * 100);
        sum += star * (counts[star] || 0);
      }
    }

    const average = totalReviews > 0 ? parseFloat((sum / totalReviews).toFixed(1)) : 5.0;

    return {
      average,
      totalReviews,
      counts,
      percentages,
    };
  },

  addReview: async (review: Omit<Review, 'id' | 'createdAt' | 'helpfulCount'>): Promise<Review> => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const newReview: Review = {
      ...review,
      id: `rev_${Date.now()}`,
      helpfulCount: 0,
      createdAt: new Date().toISOString(),
    };
    const current = getStoredReviews();
    const updated = [newReview, ...current];
    saveStoredReviews(updated);
    return newReview;
  },

  markHelpful: async (reviewId: string): Promise<number> => {
    const current = getStoredReviews();
    const idx = current.findIndex((r) => r.id === reviewId);
    if (idx !== -1) {
      current[idx].helpfulCount += 1;
      saveStoredReviews(current);
      return current[idx].helpfulCount;
    }
    return 0;
  },
};
