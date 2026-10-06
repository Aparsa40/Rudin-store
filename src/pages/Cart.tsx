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
  Store,
  Bookmark,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useUIStore } from '../store/uiStore';
import { cartService } from '../services/cart/cartService';
import { couponsService } from '../services/coupons/couponsService';
import { ResolvedCartItem, VendorCartGroup, CartItem } from '../types';
import { Button } from '../components/ui/Button';

export const Cart: React.FC = () => {
  const {
    items,
    saveForLater,
    appliedCoupon,
    updateQuantity,
    removeItem,
    moveToSaveForLater,
    moveToCartFromSaved,
    removeSavedItem,
    clearCart,
    applyCoupon,
    removeCoupon,
  } = useCartStore();

  const { toggleWishlist } = useWishlistStore();
  const { addToast } = useUIStore();
  const navigate = useNavigate();

  const [resolvedItems, setResolvedItems] = useState<ResolvedCartItem[]>([]);
  const [resolvedSavedItems, setResolvedSavedItems] = useState<ResolvedCartItem[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    Promise.all([
      cartService.resolveCartItems(items),
      cartService.resolveCartItems(saveForLater),
    ]).then(([resItems, resSaved]) => {
      if (active) {
        setResolvedItems(resItems);
        setResolvedSavedItems(resSaved);
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [items, saveForLater]);

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
      addToast(`Promo code "${res.coupon.code}" applied!`, 'success');
    } else {
      setCouponError(res.error || 'Invalid code');
    }
  };

  const handleMoveToWishlist = (item: ResolvedCartItem) => {
    toggleWishlist(item.productId);
    removeItem(item.id);
    addToast(`"${item.product.title}" saved to Wishlist`, 'info');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="animate-pulse space-y-4 max-w-3xl mx-auto">
          <div className="h-8 bg-slate-200 rounded w-1/4" />
          <div className="h-32 bg-slate-200 rounded-2xl" />
          <div className="h-32 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (resolvedItems.length === 0 && resolvedSavedItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-2">Your Shopping Cart is Empty</h1>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          Support verified independent makers around the world. Discover handmade ceramics,
          precision audio, and Japanese denim.
        </p>
        <Link to="/shop">
          <Button size="lg" className="w-full font-bold">
            Explore Marketplace Catalog
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Shopping Cart ({items.reduce((sum: number, i: CartItem) => sum + i.quantity, 0)} Items)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Fulfilled and insured directly by independent studio creators
          </p>
        </div>
        <button
          onClick={clearCart}
          className="text-xs text-slate-400 hover:text-rose-600 font-semibold self-start sm:self-auto"
        >
          Clear entire cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Vendor Groups & Save for Later (8 Cols) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Free Shipping Strip */}
          <div className="p-4 bg-slate-100/70 border border-slate-200 rounded-2xl">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-2">
              <span>
                {subtotal >= freeShippingThreshold ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Free standard courier
                    shipping unlocked!
                  </span>
                ) : (
                  <>
                    Add <strong>${(freeShippingThreshold - subtotal).toFixed(2)}</strong> more for
                    free delivery
                  </>
                )}
              </span>
              <span className="font-bold text-slate-900">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Multi-Vendor Cart Groups */}
          <div className="space-y-6">
            {vendorGroups.map((group: VendorCartGroup) => (
              <div
                key={group.vendor.id}
                className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm"
              >
                {/* Vendor Header */}
                <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={group.vendor.logoUrl}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <Link
                        to={`/vendors/${group.vendor.slug}`}
                        className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-1.5"
                      >
                        {group.vendor.storeName}
                        {group.vendor.isVerified && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded font-bold">
                            Verified
                          </span>
                        )}
                      </Link>
                      <span className="text-[11px] text-slate-400 block -mt-0.5">
                        Dispatches from {group.vendor.location}
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <span className="text-slate-500 font-medium">Vendor Subtotal: </span>
                    <strong className="text-slate-900">${group.subtotal.toFixed(2)}</strong>
                    <span className="text-slate-400 mx-1.5">•</span>
                    <span className="text-slate-500">
                      Shipping:{' '}
                      {group.shipping === 0 ? (
                        <strong className="text-emerald-600">Free</strong>
                      ) : (
                        `$${group.shipping}`
                      )}
                    </span>
                  </div>
                </div>

                {/* Items in Vendor Group */}
                <div className="divide-y divide-slate-100">
                  {group.items.map((item: ResolvedCartItem) => {
                    const price = item.variant ? item.variant.price : item.product.price;
                    const imgUrl = item.variant?.imageUrl || item.product.images[0]?.url;

                    return (
                      <div key={item.id} className="p-6 flex flex-col sm:flex-row gap-5">
                        <Link
                          to={`/product/${item.product.slug}`}
                          className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 flex-shrink-0"
                        >
                          <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                        </Link>

                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start gap-4">
                              <Link
                                to={`/product/${item.product.slug}`}
                                className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors line-clamp-1"
                              >
                                {item.product.title}
                              </Link>
                              <span className="text-base font-extrabold text-slate-900 whitespace-nowrap">
                                ${(price * item.quantity).toFixed(2)}
                              </span>
                            </div>

                            {item.variant && (
                              <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Variant: {item.variant.name}
                              </p>
                            )}

                            <p className="text-xs text-slate-400 mt-1">
                              Unit price: ${price.toFixed(2)}
                            </p>
                          </div>

                          {/* Controls Row */}
                          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 mt-2">
                            {/* Quantity */}
                            <div className="flex items-center border border-slate-200 rounded-xl h-10 px-2 bg-slate-50">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="p-1 text-slate-500 hover:text-slate-900"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center text-xs font-bold text-slate-900">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="p-1 text-slate-500 hover:text-slate-900"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Secondary Actions */}
                            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                              <button
                                onClick={() => moveToSaveForLater(item.id)}
                                className="hover:text-slate-900 flex items-center gap-1"
                              >
                                <Bookmark className="w-3.5 h-3.5" /> Save for later
                              </button>
                              <button
                                onClick={() => handleMoveToWishlist(item)}
                                className="hover:text-rose-600 flex items-center gap-1"
                              >
                                <Heart className="w-3.5 h-3.5" /> Move to wishlist
                              </button>
                              <button
                                onClick={() => removeItem(item.id)}
                                className="hover:text-rose-600 flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Remove
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

          {/* Save For Later Shelf */}
          {resolvedSavedItems.length > 0 && (
            <div className="pt-8 border-t border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Saved for Later ({resolvedSavedItems.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {resolvedSavedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-white border border-slate-200 rounded-2xl flex gap-4 items-center"
                  >
                    <img
                      src={item.product.images[0]?.url}
                      alt=""
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {item.product.title}
                      </p>
                      <p className="text-xs font-extrabold text-slate-900 my-1">
                        ${item.product.price.toFixed(2)}
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                        <button
                          onClick={() => moveToCartFromSaved(item.id)}
                          className="font-bold text-blue-600 hover:underline"
                        >
                          Move to cart
                        </button>
                        <button
                          onClick={() => removeSavedItem(item.id)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Order Summary (4 Cols) */}
        <div className="lg:col-span-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 sticky top-24 shadow-sm">
            <h3 className="text-lg font-black text-slate-900">Order Summary</h3>

            {/* Coupon Box */}
            <div className="space-y-2">
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    <span>
                      Applied: <strong>{appliedCoupon.code}</strong>
                    </span>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-emerald-700 hover:text-emerald-900"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Coupon (e.g. RUDIN15)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 uppercase font-mono font-bold"
                  />
                  <Button type="submit" size="sm" variant="outline" isLoading={isApplyingCoupon}>
                    Apply
                  </Button>
                </form>
              )}
              {couponError && <p className="text-[11px] text-rose-600">{couponError}</p>}
            </div>

            {/* Price Calculations */}
            <div className="space-y-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-bold text-slate-900">${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Promotional Discount</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Multi-Vendor Shipping</span>
                <span>
                  {shipping === 0 ? (
                    <strong className="text-emerald-600">Free</strong>
                  ) : (
                    `$${shipping.toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Sales Tax (8%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline text-slate-900">
                <span className="text-sm font-bold">Estimated Grand Total</span>
                <span className="text-2xl font-black">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <Button
              onClick={() => navigate('/checkout')}
              disabled={resolvedItems.length === 0}
              size="lg"
              className="w-full h-12 text-sm font-bold flex items-center justify-between px-6"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            <div className="pt-2 text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Buyer Protection & Escrow Guarantee</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Independent vendors receive payment only once tracking confirms safe delivery.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
