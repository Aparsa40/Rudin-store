import { Coupon } from '../../types';
import { mockCoupons } from '../../data/mockData';

export const couponsService = {
  validateCoupon: async (
    code: string,
    currentSubtotal = 0,
  ): Promise<{ valid: boolean; coupon?: Coupon; error?: string }> => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const normalized = code.trim().toUpperCase();
    const coupon = mockCoupons.find((c) => c.code === normalized);

    if (!coupon || !coupon.isActive || new Date(coupon.validUntil).getTime() < Date.now()) {
      return { valid: false, error: 'Invalid or expired promotional code.' };
    }

    if (coupon.minPurchaseAmount && currentSubtotal < coupon.minPurchaseAmount) {
      return {
        valid: false,
        error: `Requires a minimum cart spend of $${coupon.minPurchaseAmount.toFixed(2)}.`,
      };
    }

    return { valid: true, coupon };
  },

  getAvailableCoupons: async (): Promise<Coupon[]> => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return mockCoupons.filter((c) => c.isActive);
  },
};
