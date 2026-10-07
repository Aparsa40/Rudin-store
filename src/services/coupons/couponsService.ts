import { Coupon } from '../../types';
import { mockCoupons } from '../../data/mockData';

const getStoredCoupons = (): Coupon[] => {
  try {
    const data = localStorage.getItem('rudin_coupons');
    if (data) return JSON.parse(data);
  } catch (e) {
    // Ignore
  }
  return mockCoupons;
};

const saveStoredCoupons = (coupons: Coupon[]) => {
  try {
    localStorage.setItem('rudin_coupons', JSON.stringify(coupons));
  } catch (e) {
    // Ignore
  }
};

export const couponsService = {
  validateCoupon: async (
    code: string,
    currentSubtotal = 0
  ): Promise<{ valid: boolean; coupon?: Coupon; error?: string }> => {
    await new Promise(resolve => setTimeout(resolve, 150));
    const normalized = code.trim().toUpperCase();
    const all = getStoredCoupons();
    const coupon = all.find(c => c.code === normalized);

    if (!coupon) {
      return { valid: false, error: 'Promotional code not found.' };
    }

    if (!coupon.isActive) {
      return { valid: false, error: 'This promotional code is inactive or disabled.' };
    }

    const now = new Date();

    // Check validFrom if specified
    if (coupon.validFrom) {
      const fromDate = new Date(coupon.validFrom);
      if (!isNaN(fromDate.getTime()) && now < fromDate) {
        return { valid: false, error: 'This promotional code is not yet active.' };
      }
    }

    // Check validUntil if specified
    if (coupon.validUntil) {
      const untilDate = new Date(coupon.validUntil);
      if (!isNaN(untilDate.getTime()) && now > untilDate) {
        return { valid: false, error: 'This promotional code has expired.' };
      }
    }

    // Check type-specific value constraints
    if (coupon.type === 'PERCENTAGE') {
      if (coupon.value <= 0 || coupon.value > 100) {
        return { valid: false, error: 'Invalid discount percentage configuration.' };
      }
    } else if (coupon.type === 'FIXED') {
      if (coupon.value <= 0) {
        return { valid: false, error: 'Invalid fixed discount value.' };
      }
    }

    // Check minimum purchase amount
    if (coupon.minPurchaseAmount && currentSubtotal < coupon.minPurchaseAmount) {
      return {
        valid: false,
        error: `Requires a minimum cart spend of $${coupon.minPurchaseAmount.toFixed(2)}.`
      };
    }

    return { valid: true, coupon };
  },

  getAvailableCoupons: async (): Promise<Coupon[]> => {
    await new Promise(resolve => setTimeout(resolve, 80));
    return getStoredCoupons().filter(c => c.isActive);
  },

  getAllCoupons: async (): Promise<Coupon[]> => {
    await new Promise(resolve => setTimeout(resolve, 80));
    return getStoredCoupons();
  },

  createCoupon: async (newCoupon: Coupon): Promise<Coupon> => {
    await new Promise(resolve => setTimeout(resolve, 150));
    const current = getStoredCoupons();
    const updated = [newCoupon, ...current.filter(c => c.code !== newCoupon.code)];
    saveStoredCoupons(updated);
    return newCoupon;
  },

  toggleCoupon: async (code: string): Promise<Coupon | null> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const current = getStoredCoupons();
    const idx = current.findIndex(c => c.code === code);
    if (idx === -1) return null;
    current[idx].isActive = !current[idx].isActive;
    saveStoredCoupons(current);
    return current[idx];
  }
};
