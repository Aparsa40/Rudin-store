import { CartItem, ResolvedCartItem, VendorCartGroup, Coupon } from '../../types';
import { mockProducts, mockVendors } from '../../data/mockData';

export const cartService = {
  resolveCartItems: async (items: CartItem[]): Promise<ResolvedCartItem[]> => {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const resolved: ResolvedCartItem[] = [];

    for (const item of items) {
      const product = mockProducts.find((p) => p.id === item.productId);
      if (product) {
        const vendor = mockVendors.find((v) => v.id === product.vendorId);
        const variant = item.variantId
          ? product.variants.find((v) => v.id === item.variantId)
          : undefined;
        if (vendor) {
          resolved.push({
            ...item,
            product,
            variant,
            vendor,
          });
        }
      }
    }
    return resolved;
  },

  groupItemsByVendor: (resolvedItems: ResolvedCartItem[]): VendorCartGroup[] => {
    const groupsMap = new Map<string, ResolvedCartItem[]>();

    for (const item of resolvedItems) {
      const vendorId = item.vendor.id;
      if (!groupsMap.has(vendorId)) {
        groupsMap.set(vendorId, []);
      }
      groupsMap.get(vendorId)!.push(item);
    }

    const groups: VendorCartGroup[] = [];

    groupsMap.forEach((vendorItems) => {
      const vendor = vendorItems[0].vendor;
      const subtotal = vendorItems.reduce((acc, i) => {
        const unitPrice = i.variant ? i.variant.price : i.product.price;
        return acc + unitPrice * i.quantity;
      }, 0);

      // Shipping policy: Free above $75 per vendor, else $12
      const shipping = subtotal >= 75 ? 0 : 12;

      groups.push({
        vendor,
        items: vendorItems,
        subtotal,
        shipping,
        estimatedDelivery: '3-5 Business Days',
      });
    });

    return groups;
  },

  calculateTotals: (resolvedItems: ResolvedCartItem[], appliedCoupon: Coupon | null) => {
    const subtotal = resolvedItems.reduce((acc, item) => {
      const unitPrice = item.variant ? item.variant.price : item.product.price;
      return acc + unitPrice * item.quantity;
    }, 0);

    // Group shipping
    const vendorGroups = cartService.groupItemsByVendor(resolvedItems);
    let shipping = vendorGroups.reduce((acc, g) => acc + g.shipping, 0);

    // Calculate coupon discount
    let discount = 0;
    if (
      appliedCoupon &&
      appliedCoupon.isActive &&
      new Date(appliedCoupon.validUntil).getTime() >= Date.now()
    ) {
      if (!appliedCoupon.minPurchaseAmount || subtotal >= appliedCoupon.minPurchaseAmount) {
        if (appliedCoupon.type === 'PERCENTAGE') {
          discount = (subtotal * appliedCoupon.value) / 100;
          if (appliedCoupon.maxDiscount && discount > appliedCoupon.maxDiscount) {
            discount = appliedCoupon.maxDiscount;
          }
        } else if (appliedCoupon.type === 'FIXED') {
          discount = Math.min(appliedCoupon.value, subtotal);
        } else if (appliedCoupon.type === 'FREE_SHIPPING') {
          shipping = 0;
        }
      }
    }

    const estimatedTax = subtotal * 0.08; // 8% sales tax
    const total = Math.max(0, subtotal - discount + shipping + estimatedTax);

    return {
      subtotal,
      discount,
      shipping,
      tax: estimatedTax,
      total,
      vendorGroups,
    };
  },
};
