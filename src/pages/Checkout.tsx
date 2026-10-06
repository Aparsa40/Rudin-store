import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  CreditCard,
  Truck,
  ArrowRight,
  ArrowLeft,
  Lock,
  Package,
  Calendar,
} from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { cartService } from '../services/cart/cartService';
import { ordersService } from '../services/orders/ordersService';
import { authService } from '../services/auth/authService';
import { ResolvedCartItem, Address, PaymentMethod, Order } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const Checkout: React.FC = () => {
  const { items, appliedCoupon, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const navigate = useNavigate();

  const [resolvedItems, setResolvedItems] = useState<ResolvedCartItem[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Address, 2: Delivery, 3: Payment, 4: Success
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Address selection & form
  const [useSavedAddress, setUseSavedAddress] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [addressForm, setAddressForm] = useState<Address>({
    id: '',
    userId: user?.id || 'u1',
    fullName: user ? `${user.firstName} ${user.lastName}` : '',
    phone: user?.phone || '',
    street1: '',
    street2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
    label: 'Home',
    isDefault: false,
  });

  // Shipping Method
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express' | 'overnight'>(
    'standard',
  );

  // Payment Form
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CREDIT_CARD');
  const [cardData, setCardData] = useState({
    name: user ? `${user.firstName} ${user.lastName}` : 'Alex Morgan',
    number: '4242 •••• •••• 4242',
    expiry: '12/28',
    cvc: '888',
  });

  useEffect(() => {
    let active = true;
    Promise.all([cartService.resolveCartItems(items), authService.getAddresses()]).then(
      ([resItems, addresses]) => {
        if (active) {
          setResolvedItems(resItems);
          setSavedAddresses(addresses);
          if (addresses.length > 0) {
            const defaultAddr = addresses.find((a: Address) => a.isDefault) || addresses[0];
            setSelectedAddressId(defaultAddr.id);
            setAddressForm(defaultAddr);
          }
        }
      },
    );
    return () => {
      active = false;
    };
  }, [items, user]);

  const {
    subtotal,
    discount,
    shipping: baseShipping,
    tax,
    total,
  } = cartService.calculateTotals(resolvedItems, appliedCoupon);

  // Extra shipping method surcharges
  const shippingSurcharge =
    shippingMethod === 'express' ? 15 : shippingMethod === 'overnight' ? 35 : 0;
  const finalShipping = baseShipping + shippingSurcharge;
  const grandTotal = Math.max(0, subtotal - discount + finalShipping + tax);

  const getEffectiveAddress = (): Address => {
    if (useSavedAddress && selectedAddressId) {
      const found = savedAddresses.find((a) => a.id === selectedAddressId);
      if (found) return found;
    }
    return addressForm;
  };

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    const addr = getEffectiveAddress();
    if (!addr.fullName || !addr.street1 || !addr.city || !addr.state || !addr.postalCode) {
      addToast('Please complete all required shipping address fields', 'error');
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = () => {
    setStep(3);
  };

  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const shippingAddress = getEffectiveAddress();
      const shippingLabel =
        shippingMethod === 'overnight'
          ? 'Next Day Priority Air ($35.00)'
          : shippingMethod === 'express'
            ? 'DHL Express Air (2-3 Days) ($15.00)'
            : 'Standard Tracked Courier (3-5 Days)';

      const created = await ordersService.createOrder({
        userId: user?.id || 'u1',
        items: resolvedItems,
        shippingAddress,
        billingAddress: shippingAddress,
        shippingMethod: shippingLabel,
        paymentMethod,
        subtotal,
        discount,
        shippingCost: finalShipping,
        tax,
        total: grandTotal,
      });

      setCompletedOrder(created);
      clearCart();
      setIsProcessing(false);
      setStep(4);
      addToast('Order successfully confirmed!', 'success');
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      addToast('An error occurred during payment verification.', 'error');
    }
  };

  if (items.length === 0 && step !== 4) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">No Items in Cart</h2>
        <p className="text-sm text-slate-500 mb-6">
          Your cart is currently empty. Add items before checking out.
        </p>
        <Link to="/shop">
          <Button>Browse Catalog</Button>
        </Link>
      </div>
    );
  }

  // STEP 4: ORDER SUCCESS RECEIPT
  if (step === 4 && completedOrder) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-sm text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <Badge variant="success" size="md" className="mb-3">
            Payment Verified & Escrow Established
          </Badge>

          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
            Order Confirmed!
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-8">
            Thank you, {completedOrder.shippingAddress.fullName}. A confirmation email and tracking
            link have been dispatched.
          </p>

          {/* Order Details Summary Box */}
          <div className="bg-slate-50 rounded-2xl p-6 text-left border border-slate-200 mb-8 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">Order Reference:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {completedOrder.orderNumber}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">Carrier & Tracking:</span>
              <span className="font-mono font-bold text-blue-600">
                {completedOrder.carrier} ({completedOrder.trackingNumber})
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">Ship to Address:</span>
              <span className="text-slate-900 font-medium text-right max-w-xs">
                {completedOrder.shippingAddress.street1}, {completedOrder.shippingAddress.city},{' '}
                {completedOrder.shippingAddress.state} {completedOrder.shippingAddress.postalCode}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-1">
              <span>Total Paid:</span>
              <span className="text-lg font-black">${completedOrder.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/account/orders" className="flex-1">
              <Button variant="outline" className="w-full font-bold">
                View in Orders Dashboard
              </Button>
            </Link>
            <Link to="/shop" className="flex-1">
              <Button className="w-full font-bold">Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-80px)] py-10">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Checkout Steps Progress Bar */}
        <div className="mb-8 flex items-center justify-between max-w-2xl mx-auto text-xs font-bold text-slate-400">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-slate-900' : ''}`}>
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step >= 1 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              1
            </span>
            <span>Shipping</span>
          </div>
          <div className="flex-1 h-0.5 bg-slate-200 mx-3" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-slate-900' : ''}`}>
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step >= 2 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              2
            </span>
            <span>Delivery Method</span>
          </div>
          <div className="flex-1 h-0.5 bg-slate-200 mx-3" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-slate-900' : ''}`}>
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step >= 3 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              3
            </span>
            <span>Payment</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Stepper Form Column (8 Cols) */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-6 sm:p-10">
              {/* STEP 1: SHIPPING ADDRESS */}
              {step === 1 && (
                <div>
                  <h2 className="text-2xl font-black text-slate-900 mb-6">Shipping Destination</h2>

                  {savedAddresses.length > 0 && (
                    <div className="mb-6 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>Select Saved Address</span>
                        <button
                          type="button"
                          onClick={() => setUseSavedAddress(!useSavedAddress)}
                          className="text-blue-600 hover:underline"
                        >
                          {useSavedAddress ? '+ Enter New Address' : 'Use Saved Address'}
                        </button>
                      </div>

                      {useSavedAddress && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {savedAddresses.map((addr) => (
                            <div
                              key={addr.id}
                              onClick={() => {
                                setSelectedAddressId(addr.id);
                                setAddressForm(addr);
                              }}
                              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                                selectedAddressId === addr.id
                                  ? 'border-slate-900 bg-slate-50'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-slate-900">
                                  {addr.fullName}
                                </span>
                                {addr.label && (
                                  <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-bold">
                                    {addr.label}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {addr.street1} {addr.street2 && `, ${addr.street2}`}
                              </p>
                              <p className="text-xs text-slate-600">
                                {addr.city}, {addr.state} {addr.postalCode}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {(!useSavedAddress || savedAddresses.length === 0) && (
                    <form id="shipping-form" onSubmit={handleNextStep1} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-900 mb-1">
                            Full Name *
                          </label>
                          <input
                            required
                            type="text"
                            value={addressForm.fullName}
                            onChange={(e) =>
                              setAddressForm({ ...addressForm, fullName: e.target.value })
                            }
                            className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-900 mb-1">
                            Phone Number *
                          </label>
                          <input
                            required
                            type="tel"
                            value={addressForm.phone}
                            onChange={(e) =>
                              setAddressForm({ ...addressForm, phone: e.target.value })
                            }
                            className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-slate-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-900 mb-1">
                          Street Address *
                        </label>
                        <input
                          required
                          type="text"
                          value={addressForm.street1}
                          onChange={(e) =>
                            setAddressForm({ ...addressForm, street1: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-slate-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-900 mb-1">
                            City *
                          </label>
                          <input
                            required
                            type="text"
                            value={addressForm.city}
                            onChange={(e) =>
                              setAddressForm({ ...addressForm, city: e.target.value })
                            }
                            className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-900 mb-1">
                            State / Province *
                          </label>
                          <input
                            required
                            type="text"
                            value={addressForm.state}
                            onChange={(e) =>
                              setAddressForm({ ...addressForm, state: e.target.value })
                            }
                            className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-900 mb-1">
                            Postal Code *
                          </label>
                          <input
                            required
                            type="text"
                            value={addressForm.postalCode}
                            onChange={(e) =>
                              setAddressForm({ ...addressForm, postalCode: e.target.value })
                            }
                            className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-slate-500"
                          />
                        </div>
                      </div>
                    </form>
                  )}

                  <div className="mt-8 flex justify-end">
                    <Button onClick={handleNextStep1} size="lg" className="font-bold gap-2">
                      <span>Continue to Delivery</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 2: DELIVERY METHOD */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-900">Select Delivery Method</h2>
                    <button
                      onClick={() => setStep(1)}
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Address
                    </button>
                  </div>

                  <div className="space-y-3">
                    <label
                      onClick={() => setShippingMethod('standard')}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        shippingMethod === 'standard'
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Truck className="w-5 h-5 text-slate-700" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            Standard Insured Courier (3-5 Days)
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Tracked ground delivery with climate offset
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-slate-900">
                        {baseShipping === 0 ? 'FREE' : `$${baseShipping.toFixed(2)}`}
                      </span>
                    </label>

                    <label
                      onClick={() => setShippingMethod('express')}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        shippingMethod === 'express'
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            DHL Express Air (2-3 Business Days)
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Priority international air transport
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-slate-900">
                        ${(baseShipping + 15).toFixed(2)}
                      </span>
                    </label>

                    <label
                      onClick={() => setShippingMethod('overnight')}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        shippingMethod === 'overnight'
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-amber-600" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            Next-Day Priority Rush Delivery
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Guaranteed next business day afternoon arrival
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-slate-900">
                        ${(baseShipping + 35).toFixed(2)}
                      </span>
                    </label>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <Button onClick={handleNextStep2} size="lg" className="font-bold gap-2">
                      <span>Continue to Payment</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: PAYMENT METHOD */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-900">Payment Information</h2>
                    <button
                      onClick={() => setStep(2)}
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Delivery
                    </button>
                  </div>

                  {/* Payment Tabs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CREDIT_CARD')}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-colors ${
                        paymentMethod === 'CREDIT_CARD'
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" /> Credit Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('APPLE_PAY')}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-colors ${
                        paymentMethod === 'APPLE_PAY'
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Apple Pay
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('PAYPAL')}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-colors ${
                        paymentMethod === 'PAYPAL'
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      PayPal
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CASH_ON_DELIVERY')}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-colors ${
                        paymentMethod === 'CASH_ON_DELIVERY'
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Pay on Delivery
                    </button>
                  </div>

                  {/* Card Form Mock */}
                  {paymentMethod === 'CREDIT_CARD' && (
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-900 mb-1">
                          Name on Card
                        </label>
                        <input
                          type="text"
                          value={cardData.name}
                          onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-900 mb-1">
                          Card Number (Mock Demo)
                        </label>
                        <input
                          type="text"
                          value={cardData.number}
                          onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl outline-none font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-900 mb-1">
                            Expiration
                          </label>
                          <input
                            type="text"
                            value={cardData.expiry}
                            onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                            className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-900 mb-1">
                            Security Code (CVC)
                          </label>
                          <input
                            type="text"
                            value={cardData.cvc}
                            onChange={(e) => setCardData({ ...cardData, cvc: e.target.value })}
                            className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 flex justify-between items-center pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Lock className="w-4 h-4 text-emerald-600" />
                      <span>256-bit TLS encrypted bank-grade authorization</span>
                    </div>

                    <Button
                      onClick={handleCompleteOrder}
                      size="lg"
                      isLoading={isProcessing}
                      className="font-bold text-sm h-12 px-8"
                    >
                      Authorize & Pay ${grandTotal.toFixed(2)}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Checkout Summary (4 Cols) */}
          <div className="lg:col-span-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 sticky top-24 shadow-sm">
              <h3 className="text-base font-black text-slate-900">
                Order Items ({resolvedItems.reduce((acc, i) => acc + i.quantity, 0)})
              </h3>

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto no-scrollbar pr-1">
                {resolvedItems.map((item) => (
                  <div key={item.id} className="py-3 flex items-center gap-3 text-xs">
                    <img
                      src={item.product.images[0]?.url}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover bg-slate-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{item.product.title}</p>
                      <p className="text-slate-500">Qty: {item.quantity}</p>
                    </div>
                    <span className="font-bold text-slate-900">
                      $
                      {(
                        (item.variant ? item.variant.price : item.product.price) * item.quantity
                      ).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-xs text-slate-600 pt-3 border-t border-slate-200">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-900">${subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>
                    {finalShipping === 0 ? (
                      <strong className="text-emerald-600">Free</strong>
                    ) : (
                      `$${finalShipping.toFixed(2)}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-3 border-t border-slate-200 text-slate-900 font-black text-lg">
                  <span>Total Due</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
