import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const Checkout: React.FC = () => {
  const { items, clearCart } = useCartStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock checkout state
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    cardNumber: '',
    expiry: '',
    cvc: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmitStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      clearCart();
      setStep(3);
    }, 1500);
  };

  if (items.length === 0 && step !== 3) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
        <Link to="/shop">
          <Button>Return to Shop</Button>
        </Link>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto text-center bg-white p-8 rounded-2xl border border-slate-200">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Order Confirmed!</h1>
          <p className="text-slate-500 mb-8">
            Thank you for your purchase. We've sent a confirmation email to <strong>{formData.email || 'your email'}</strong>.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 mb-8 text-left">
            <div className="text-sm text-slate-500 mb-1">Order Number</div>
            <div className="font-mono font-medium text-slate-900">#ORD-{Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}</div>
          </div>
          <Link to="/">
            <Button className="w-full">Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-64px)] py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4 text-sm font-medium">
          <div className={step >= 1 ? 'text-slate-900' : 'text-slate-400'}>1. Shipping</div>
          <div className="w-8 h-px bg-slate-300"></div>
          <div className={step >= 2 ? 'text-slate-900' : 'text-slate-400'}>2. Payment</div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Form */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {step === 1 && (
                <div className="p-6 md:p-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">Shipping Address</h2>
                  <form onSubmit={handleSubmitStep1}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                          <input required type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                          <input required type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                        <input required type="text" name="address" value={formData.address} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" />
                      </div>
                      <div className="grid grid-cols-6 gap-4">
                        <div className="col-span-3">
                          <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                          <input required type="text" name="city" value={formData.city} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                          <input required type="text" name="state" value={formData.state} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-slate-700 mb-1">ZIP</label>
                          <input required type="text" name="zipCode" value={formData.zipCode} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-8 flex justify-end">
                      <Button type="submit" size="lg">Continue to Payment</Button>
                    </div>
                  </form>
                </div>
              )}

              {step === 2 && (
                <div className="p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">Payment</h2>
                    <button onClick={() => setStep(1)} className="text-sm font-medium text-blue-600 hover:underline">Edit Shipping</button>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8">
                    <div className="text-sm text-slate-500 mb-1">Ship to:</div>
                    <div className="font-medium text-slate-900">{formData.firstName} {formData.lastName}</div>
                    <div className="text-slate-600 text-sm">{formData.address}, {formData.city}, {formData.state} {formData.zipCode}</div>
                  </div>

                  <form onSubmit={handlePlaceOrder}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Card Number (Mock)</label>
                        <input required type="text" placeholder="0000 0000 0000 0000" name="cardNumber" value={formData.cardNumber} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none font-mono" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Expiry (MM/YY)</label>
                          <input required type="text" placeholder="12/25" name="expiry" value={formData.expiry} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none font-mono" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">CVC</label>
                          <input required type="text" placeholder="123" name="cvc" value={formData.cvc} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none font-mono" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-8 flex items-center justify-between">
                      <div className="flex items-center text-sm text-slate-500">
                        <ShieldCheck className="w-5 h-5 text-green-600 mr-2" />
                        Secure Checkout
                      </div>
                      <Button type="submit" size="lg" isLoading={isProcessing}>
                        Place Order
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Mini Summary */}
          <div className="lg:w-1/3">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sticky top-24">
              <h3 className="font-bold text-slate-900 mb-4">Order Summary</h3>
              <div className="text-sm text-slate-500 mb-6">
                {items.length} items in cart
              </div>
              <div className="flex justify-between items-center text-lg font-bold text-slate-900 pt-4 border-t border-slate-200">
                <span>Total to pay</span>
                <span>(Calculated)</span> {/* Ideally calculated like in Cart */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
