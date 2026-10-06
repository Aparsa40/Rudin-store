import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { productsService, vendorService } from '../services/products.service';
import { ResolvedCartItem, Vendor } from '../types';
import { Button } from '../components/ui/Button';

export const Cart: React.FC = () => {
  const { items, updateQuantity, removeItem, clearCart } = useCartStore();
  const [resolvedItems, setResolvedItems] = useState<ResolvedCartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const resolveCart = async () => {
      setIsLoading(true);
      try {
        const resolved: ResolvedCartItem[] = [];
        for (const item of items) {
          const product = await productsService.getProductById(item.productId);
          if (product) {
            const vendor = await vendorService.getVendorById(product.vendorId);
            const variant = item.variantId ? product.variants.find(v => v.id === item.variantId) : undefined;
            if (vendor) {
              resolved.push({
                ...item,
                product,
                vendor,
                variant
              });
            }
          }
        }
        setResolvedItems(resolved);
      } catch (error) {
        console.error('Error resolving cart', error);
      } finally {
        setIsLoading(false);
      }
    };
    resolveCart();
  }, [items]);

  // Group items by vendor
  const itemsByVendor = resolvedItems.reduce((acc, item) => {
    const vendorId = item.vendor.id;
    if (!acc[vendorId]) {
      acc[vendorId] = {
        vendor: item.vendor,
        items: []
      };
    }
    acc[vendorId].items.push(item);
    return acc;
  }, {} as Record<string, { vendor: Vendor, items: ResolvedCartItem[] }>);

  const subtotal = resolvedItems.reduce((total, item) => {
    const price = item.variant ? item.variant.price : item.product.price;
    return total + price * item.quantity;
  }, 0);
  
  const shipping = subtotal > 50 ? 0 : 15.00;
  const total = subtotal + shipping;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="animate-pulse max-w-4xl mx-auto space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-8"></div>
          <div className="h-32 bg-slate-200 rounded-xl"></div>
          <div className="h-32 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (resolvedItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-4">Your cart is empty</h2>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">
          Looks like you haven't added anything to your cart yet. Discover great products from independent sellers.
        </p>
        <Link to="/shop">
          <Button size="lg">Start Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Your Cart ({items.length} items)</h1>
      
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        <div className="lg:w-2/3 flex flex-col gap-6">
          {Object.values(itemsByVendor).map(({ vendor, items }) => (
            <div key={vendor.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                    {vendor.logoUrl ? (
                      <img src={vendor.logoUrl} alt={vendor.storeName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                        {vendor.storeName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <Link to={`/vendors/${vendor.slug}`} className="font-bold text-slate-900 hover:underline">
                    {vendor.storeName}
                  </Link>
                </div>
              </div>
              
              <div className="divide-y divide-slate-100">
                {items.map((item) => {
                  const price = item.variant ? item.variant.price : item.product.price;
                  const primaryImg = item.product.images.find(img => img.isPrimary) || item.product.images[0];
                  
                  return (
                    <div key={item.id} className="p-6 flex flex-col sm:flex-row gap-6">
                      <Link to={`/product/${item.product.slug}`} className="w-24 h-24 sm:w-32 sm:h-32 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={primaryImg.url} alt={item.product.title} className="w-full h-full object-cover" />
                      </Link>
                      
                      <div className="flex-1 flex flex-col">
                        <div className="flex justify-between items-start gap-4 mb-2">
                          <Link to={`/product/${item.product.slug}`} className="font-medium text-slate-900 hover:text-blue-600 line-clamp-2">
                            {item.product.title}
                          </Link>
                          <span className="font-bold text-slate-900 whitespace-nowrap">
                            ${(price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                        
                        {item.variant && (
                          <div className="text-sm text-slate-500 mb-4">
                            Variant: {item.variant.name}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-auto pt-4">
                          <div className="flex items-center border border-slate-200 rounded-lg">
                            <button 
                              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-l-lg transition-colors"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                            <button 
                              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-r-lg transition-colors"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          
                          <button 
                            className="text-sm text-red-500 font-medium hover:text-red-700 flex items-center gap-1"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4" /> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          
          <div className="flex justify-between items-center mt-4">
            <button 
              className="text-sm font-medium text-slate-500 hover:text-slate-900"
              onClick={clearCart}
            >
              Clear Cart
            </button>
            <Link to="/shop" className="text-sm font-medium text-blue-600 hover:text-blue-800">
              Continue Shopping
            </Link>
          </div>
        </div>
        
        {/* Order Summary */}
        <div className="lg:w-1/3">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sticky top-24">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Order Summary</h2>
            
            <div className="space-y-4 text-slate-600 mb-6">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-slate-900">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="font-medium text-slate-900">
                  {shipping === 0 ? <span className="text-green-600">Free</span> : `$${shipping.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span className="text-sm">Calculated at checkout</span>
              </div>
            </div>
            
            <div className="border-t border-slate-200 pt-4 mb-6">
              <div className="flex justify-between items-end">
                <span className="font-bold text-slate-900">Total</span>
                <span className="text-2xl font-bold text-slate-900">${total.toFixed(2)}</span>
              </div>
            </div>
            
            <Link to="/checkout" className="block w-full">
              <Button size="lg" className="w-full text-lg h-14 rounded-xl flex justify-between items-center px-6">
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
              <ShieldCheck className="w-5 h-5 text-green-600" />
              Secure encrypted checkout
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
