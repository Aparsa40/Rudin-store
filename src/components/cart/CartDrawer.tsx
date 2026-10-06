import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Tag,
  Heart,
  X,
} from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useUIStore } from '../../store/uiStore';
import { cartService } from '../../services/cart/cartService';
import { couponsService } from '../../services/coupons/couponsService';
import { ResolvedCartItem, VendorCartGroup } from '../../types';

export const CartDrawer: React.FC = () => {
  const {
    items,
    appliedCoupon,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
    removeItem,
    moveToSaveForLater,
    applyCoupon,
    removeCoupon,
  } = useCartStore();

  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const { addToast } = useUIStore();
  const navigate = useNavigate();

  const [resolvedItems, setResolvedItems] = useState<ResolvedCartItem[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  useEffect(() => {
    let active = true;
    cartService.resolveCartItems(items).then((res) => {
      if (active) setResolvedItems(res);
    });
    return () => {
      active = false;
    };
  }, [items]);

  const { subtotal, discount, shipping, tax, total, vendorGroups } = cartService.calculateTotals(
    resolvedItems,
    appliedCoupon,
  );

  const freeShippingThreshold = 75;
  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponError('');
    setIsApplyingCoupon(true);

    const res = await couponsService.validateCoupon(couponCode, subtotal);
    setIsApplyingCoupon(false);

    if (res.valid && res.coupon) {
      applyCoupon(res.coupon);
      setCouponCode('');
      addToast(`Coupon "${res.coupon.code}" applied successfully!`, 'success');
    } else {
      setCouponError(res.error || 'Invalid coupon code');
    }
  };

  const handleMoveToWishlist = (item: ResolvedCartItem) => {
    toggleWishlist(item.productId);
    removeItem(item.id);
    addToast(`"${item.product.title}" moved to your Wishlist`, 'info');
  };

  return (
    <Drawer
      isOpen={isDrawerOpen}
      onClose={closeDrawer}
      title={`Your Cart (${items.reduce((acc, i) => acc + i.quantity, 0)})`}
      width="max-w-md"
    >
      {items.length === 0 ? (
        <div className="p-8 flex flex-col items-center justify-center text-center h-[calc(100vh-140px)]">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Your cart is empty</h3>
          <p className="text-sm text-slate-500 max-w-xs mb-6">
            Discover independent designers, studio acoustics, and artisanal makers on Rudin.
          </p>
          <Button
            onClick={() => {
              closeDrawer();
              navigate('/shop');
            }}
          >
            Start Exploring
          </Button>
        </div>
      ) : (
        <div className="flex flex-col h-[calc(100vh-80px)]">
          {/* Free Shipping Progress Bar */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
            <div className="flex justify-between items-center text-xs font-medium text-slate-700 mb-1.5">
              <span>
                {subtotal >= freeShippingThreshold ? (
                  <span className="text-emerald-700 font-semibold">
                    🎉 You unlocked Free Standard Shipping!
                  </span>
                ) : (
                  <>
                    Add <strong>${(freeShippingThreshold - subtotal).toFixed(2)}</strong> more for
                    Free Shipping
                  </>
                )}
              </span>
              <span className="font-bold text-slate-900">{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Cart Item Groups by Vendor */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {vendorGroups.map((group: VendorCartGroup) => (
              <div
                key={group.vendor.id}
                className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm"
              >
                {/* Vendor Header */}
                <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={group.vendor.logoUrl}
                      alt={group.vendor.storeName}
                      className="w-5 h-5 rounded-full object-cover border border-slate-200"
                    />
                    <span className="font-bold text-slate-900">{group.vendor.storeName}</span>
                    {group.vendor.isVerified && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded font-semibold">
                        Verified
                      </span>
                    )}
                  </div>
                  <span className="text-slate-500">
                    Ship:{' '}
                    {group.shipping === 0 ? (
                      <strong className="text-emerald-600">Free</strong>
                    ) : (
                      `$${group.shipping}`
                    )}
                  </span>
                </div>

                {/* Items */}
                <div className="divide-y divide-slate-100">
                  {group.items.map((item) => {
                    const price = item.variant ? item.variant.price : item.product.price;
                    const imgUrl = item.variant?.imageUrl || item.product.images[0]?.url;

                    return (
                      <div key={item.id} className="p-3.5 flex gap-3">
                        <img
                          src={imgUrl}
                          alt={item.product.title}
                          className="w-16 h-16 rounded-lg object-cover bg-slate-100 flex-shrink-0 border border-slate-100"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="text-xs font-semibold text-slate-900 line-clamp-1">
                              {item.product.title}
                            </h4>
                            <span className="text-xs font-bold text-slate-900 whitespace-nowrap">
                              ${(price * item.quantity).toFixed(2)}
                            </span>
                          </div>

                          {item.variant && (
                            <p className="text-[11px] text-slate-500 mb-2">
                              Option: {item.variant.name}
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-2">
                            {/* Quantity Controls */}
                            <div className="flex items-center border border-slate-200 rounded-md bg-white">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="p-1 hover:bg-slate-100 text-slate-600 rounded-l-md"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-2 text-xs font-semibold text-slate-900">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="p-1 hover:bg-slate-100 text-slate-600 rounded-r-md"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleMoveToWishlist(item)}
                                title="Move to wishlist"
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                              >
                                <Heart className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => removeItem(item.id)}
                                title="Remove item"
                                className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Coupon & Order Summary Footer */}
          <div className="border-t border-slate-200 bg-white p-5 space-y-4 shadow-lg">
            {/* Promo Code Input */}
            <div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      Promo Code Applied: <strong>{appliedCoupon.code}</strong>
                    </span>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="p-1 text-emerald-700 hover:text-emerald-900"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Promo code (e.g. RUDIN15)"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs outline-none focus:border-slate-400 uppercase font-mono font-medium"
                    />
                  </div>
                  <Button type="submit" size="sm" variant="outline" isLoading={isApplyingCoupon}>
                    Apply
                  </Button>
                </form>
              )}
              {couponError && <p className="text-[11px] text-rose-600 mt-1">{couponError}</p>}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping (Multi-Vendor)</span>
                <span>
                  {shipping === 0 ? (
                    <strong className="text-emerald-600">Free</strong>
                  ) : (
                    `$${shipping.toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Tax (8%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-900">
                <span>Estimated Total</span>
                <span className="text-base text-slate-900">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-2 pt-1">
              <Button
                onClick={() => {
                  closeDrawer();
                  navigate('/checkout');
                }}
                className="w-full h-11 text-sm font-bold flex items-center justify-between px-5"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  closeDrawer();
                  navigate('/cart');
                }}
                className="w-full text-xs text-slate-600 hover:text-slate-900 h-8"
              >
                View Full Detailed Cart
              </Button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Multi-vendor escrow & secure SSL checkout</span>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
};
