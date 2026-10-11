import { CartItem, ResolvedCartItem, VendorCartGroup, Coupon } from '../../types';
import { productsService } from '../products/productsService';
import { vendorsService } from '../vendors/vendorsService';

export const cartService = {
  // Stock is validated against the live catalog API so deleted, draft, archived,
  // or unpublished products are never treated as available.
  fetchAvailableStock: async (productId: string, variantId?: string): Promise<number> => {
    try {
      const product = await productsService.getProductById(productId);
      if (!product) return 0;
      if (variantId) {
        const variant = product.variants.find((v) => v.id === variantId);
        if (variant) return Math.max(0, variant.stockQuantity);
      }
      return Math.max(0, product.stock);
    } catch {
      return 0;
    }
  },

  validateItemStock: async (
    productId: string,
    variantId: string | undefined,
    quantity: number
  ): Promise<{ valid: boolean; availableStock: number; error?: string }> => {
    if (quantity < 1) {
      return { valid: false, availableStock: 0, error: 'Quantity must be at least 1 unit.' };
    }
    const stock = await cartService.fetchAvailableStock(productId, variantId);
    if (stock <= 0) {
      return { valid: false, availableStock: 0, error: 'This item is currently out of stock.' };
    }
    if (quantity > stock) {
      return {
        valid: false,
        availableStock: stock,
        error: `Requested quantity exceeds available inventory (${stock} in stock).`
      };
    }
    return { valid: true, availableStock: stock };
  },

  // Resolves cart entries against the live catalog and vendor APIs. The public
  // catalog API returns 404 for unavailable products, so stale items are skipped
  // instead of silently keeping outdated prices or stock.
  resolveCartItems: async (items: CartItem[]): Promise<ResolvedCartItem[]> => {
    const settled = await Promise.allSettled(
      items.map(async (item) => {
        const product = await productsService.getProductById(item.productId);
        if (!product) return null;
        const vendor = await vendorsService.getVendorById(product.vendorId);
        if (!vendor) return null;
        const variant = item.variantId
          ? product.variants.find((v) => v.id === item.variantId)
          : undefined;
        return { ...item, product, variant, vendor } as ResolvedCartItem;
      })
    );
    return settled.flatMap((result) =>
      result.status === 'fulfilled' && result.value ? [result.value] : []
    );
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
        estimatedDelivery: '3-5 Business Days'
      });
    });

    return groups;
  },

  calculateTotals: (
    resolvedItems: ResolvedCartItem[],
    appliedCoupon: Coupon | null
  ) => {
    const subtotal = resolvedItems.reduce((acc, item) => {
      const unitPrice = item.variant ? item.variant.price : item.product.price;
      return acc + unitPrice * item.quantity;
    }, 0);

    // Group shipping
    const vendorGroups = cartService.groupItemsByVendor(resolvedItems);
    let shipping = vendorGroups.reduce((acc, g) => acc + g.shipping, 0);

    // Calculate coupon discount
    let discount = 0;
    if (appliedCoupon && appliedCoupon.isActive) {
      const now = new Date();
      const isExpired = appliedCoupon.validUntil && now > new Date(appliedCoupon.validUntil);
      const isNotYetActive = appliedCoupon.validFrom && now < new Date(appliedCoupon.validFrom);

      if (!isExpired && !isNotYetActive) {
        if (!appliedCoupon.minPurchaseAmount || subtotal >= appliedCoupon.minPurchaseAmount) {
          if (appliedCoupon.type === 'PERCENTAGE') {
            const safePercentage = Math.min(100, Math.max(0, appliedCoupon.value));
            discount = (subtotal * safePercentage) / 100;
            if (appliedCoupon.maxDiscount && discount > appliedCoupon.maxDiscount) {
              discount = appliedCoupon.maxDiscount;
            }
          } else if (appliedCoupon.type === 'FIXED') {
            discount = Math.min(Math.max(0, appliedCoupon.value), subtotal);
          } else if (appliedCoupon.type === 'FREE_SHIPPING') {
            shipping = 0;
          }
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
      vendorGroups
    };
  }
};
