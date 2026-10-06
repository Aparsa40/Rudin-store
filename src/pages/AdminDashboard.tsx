import React, { useState } from 'react';
import {
  TrendingUp,
  Users,
  Package,
  ShoppingBag,
  DollarSign,
  Tag,
  CheckCircle2,
  XCircle,
  Plus,
  ShieldCheck,
  Percent,
  Search,
} from 'lucide-react';
import { mockProducts, mockVendors, mockOrders, mockCoupons } from '../data/mockData';
import { Product, Vendor, Order, Coupon, OrderItem } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useUIStore } from '../store/uiStore';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'vendors' | 'products' | 'orders' | 'coupons'
  >('overview');

  const [vendorsList, setVendorsList] = useState<Vendor[]>(mockVendors);
  const [productsList, setProductsList] = useState<Product[]>(mockProducts);
  const [ordersList, setOrdersList] = useState<Order[]>(mockOrders);
  const [couponsList, setCouponsList] = useState<Coupon[]>(mockCoupons);

  // New Coupon Modal
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newDiscount, setNewDiscount] = useState('20');
  const [newMinSpend, setNewMinSpend] = useState('100');

  const { addToast } = useUIStore();

  const handleToggleVendorVerification = (id: string) => {
    setVendorsList(
      vendorsList.map((v) => {
        if (v.id === id) {
          const next = !v.isVerified;
          addToast(
            `${v.storeName} verification status changed to ${next ? 'VERIFIED' : 'PENDING'}`,
            'info',
          );
          return { ...v, isVerified: next };
        }
        return v;
      }),
    );
  };

  const handleToggleProductFeatured = (id: string) => {
    setProductsList(
      productsList.map((p) => {
        if (p.id === id) {
          const next = !p.isFeatured;
          addToast(`"${p.title}" featured status changed`, 'info');
          return { ...p, isFeatured: next };
        }
        return p;
      }),
    );
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;

    const newCoupon: Coupon = {
      id: `c_${Date.now()}`,
      code: newCode.toUpperCase().trim(),
      type: 'PERCENTAGE',
      value: parseFloat(newDiscount) || 10,
      minPurchaseAmount: parseFloat(newMinSpend) || 0,
      description: `${newDiscount}% off marketplace orders`,
      validUntil: '2026-12-31T23:59:59Z',
      isActive: true,
    };

    setCouponsList([newCoupon, ...couponsList]);
    setIsCouponModalOpen(false);
    setNewCode('');
    addToast(`Coupon "${newCoupon.code}" created and activated!`, 'success');
  };

  const handleToggleCoupon = (code: string) => {
    setCouponsList(
      couponsList.map((c) => {
        if (c.code === code) {
          return { ...c, isActive: !c.isActive };
        }
        return c;
      }),
    );
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)] bg-slate-50">
      {/* Admin Sidebar */}
      <aside className="w-full lg:w-64 bg-slate-950 text-slate-300 p-6 flex flex-col justify-between flex-shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-6 border-b border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-md">
              A
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">Rudin Control</h2>
              <Badge variant="primary" size="sm">
                Super Admin
              </Badge>
            </div>
          </div>

          <nav className="space-y-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:bg-slate-900 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" /> Platform Overview
            </button>
            <button
              onClick={() => setActiveTab('vendors')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors text-left ${
                activeTab === 'vendors'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4" /> Stores & Makers
              </div>
              <span className="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded font-bold">
                {vendorsList.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors text-left ${
                activeTab === 'products'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4" /> Global Catalog
              </div>
              <span className="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded font-bold">
                {productsList.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors text-left ${
                activeTab === 'orders'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4" /> All Orders
              </div>
              <span className="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded font-bold">
                {ordersList.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('coupons')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors text-left ${
                activeTab === 'coupons'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4" /> Promo Campaigns
              </div>
              <span className="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded font-bold">
                {couponsList.length}
              </span>
            </button>
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-900 text-[11px] text-slate-500">
          <p>Platform Health: 100% Online</p>
          <p>PostgreSQL Schema v2.4 Ready</p>
        </div>
      </aside>

      {/* Main Admin Content */}
      <main className="flex-1 p-6 sm:p-10 overflow-y-auto">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                Marketplace Administration
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Global transaction volume, vendor onboarding, and catalog moderation.
              </p>
            </div>

            {/* Platform KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-400">Total Marketplace GMV</span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">$248,920.00</h3>
                <span className="text-[11px] font-bold text-emerald-600 mt-1 inline-block">
                  +22.4% MoM
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-400">
                  Platform Take Rate (10%)
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">$24,892.00</h3>
                <span className="text-[11px] text-slate-400 mt-1 inline-block">
                  Direct net commission
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-400">Active Stores</span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  {vendorsList.length} verified
                </h3>
                <span className="text-[11px] text-blue-600 font-bold mt-1 inline-block">
                  100% compliance score
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-400">Active Listings</span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  {productsList.length} products
                </h3>
                <span className="text-[11px] text-slate-400 mt-1 inline-block">
                  Across 6 departments
                </span>
              </div>
            </div>

            {/* Recent Orders Overview */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">Recent Platform Transactions</h3>
              <div className="divide-y divide-slate-100 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-2.5">Order No</th>
                      <th className="py-2.5">Customer</th>
                      <th className="py-2.5">Vendors</th>
                      <th className="py-2.5">Items</th>
                      <th className="py-2.5">Total</th>
                      <th className="py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {ordersList.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50">
                        <td className="py-3 font-mono font-bold text-slate-900">{o.orderNumber}</td>
                        <td className="py-3">{o.shippingAddress.fullName}</td>
                        <td className="py-3 font-medium text-slate-900">
                          {o.items.map((i: OrderItem) => i.vendorName).join(', ')}
                        </td>
                        <td className="py-3">{o.items.length} items</td>
                        <td className="py-3 font-bold text-slate-900">${o.total.toFixed(2)}</td>
                        <td className="py-3">
                          <Badge
                            variant={o.status === 'DELIVERED' ? 'success' : 'primary'}
                            size="sm"
                          >
                            {o.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VENDORS */}
        {activeTab === 'vendors' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-black text-slate-900">Makers & Store Approvals</h1>
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4">Store Profile</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Reputation</th>
                    <th className="p-4">Followers</th>
                    <th className="p-4">Verification</th>
                    <th className="p-4 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {vendorsList.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={v.logoUrl}
                            alt=""
                            className="w-10 h-10 rounded-xl object-cover"
                          />
                          <div>
                            <p className="font-bold text-slate-900">{v.storeName}</p>
                            <span className="text-[11px] text-slate-400">{v.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">{v.location}</td>
                      <td className="p-4 font-bold">
                        {v.rating.toFixed(2)} ★ ({v.reviewCount})
                      </td>
                      <td className="p-4 font-semibold">{v.followerCount}</td>
                      <td className="p-4">
                        <Badge variant={v.isVerified ? 'success' : 'warning'} size="sm">
                          {v.isVerified ? 'VERIFIED' : 'PENDING AUDIT'}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleToggleVendorVerification(v.id)}
                          className="font-bold text-xs text-blue-600 hover:underline"
                        >
                          {v.isVerified ? 'Revoke Badge' : 'Verify Store'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PRODUCTS */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-black text-slate-900">Catalog Moderation</h1>
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4">Product</th>
                    <th className="p-4">Maker</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Rating</th>
                    <th className="p-4">Featured Status</th>
                    <th className="p-4 text-right">Curator Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {productsList.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-900">{p.title}</td>
                      <td className="p-4">{p.brandName}</td>
                      <td className="p-4 font-bold">${p.price.toFixed(2)}</td>
                      <td className="p-4">{p.rating} ★</td>
                      <td className="p-4">
                        {p.isFeatured ? (
                          <Badge variant="purple" size="sm">
                            Homepage Featured
                          </Badge>
                        ) : (
                          <span className="text-slate-400">Standard</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleToggleProductFeatured(p.id)}
                          className="font-bold text-xs text-blue-600 hover:underline"
                        >
                          {p.isFeatured ? 'Unfeature' : 'Feature on Home'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-black text-slate-900">All Marketplace Orders</h1>
            <div className="space-y-4">
              {ordersList.map((o) => (
                <div
                  key={o.id}
                  className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-2 text-xs"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-sm text-slate-900">
                      {o.orderNumber}
                    </span>
                    <Badge variant={o.status === 'DELIVERED' ? 'success' : 'primary'} size="sm">
                      {o.status}
                    </Badge>
                  </div>
                  <p className="text-slate-600">
                    Buyer: {o.shippingAddress.fullName} • Destination: {o.shippingAddress.city},{' '}
                    {o.shippingAddress.state}
                  </p>
                  <p className="text-slate-500">
                    Carrier: {o.carrier} ({o.trackingNumber}) • Total:{' '}
                    <strong>${o.total.toFixed(2)}</strong>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: COUPONS */}
        {activeTab === 'coupons' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Promotions & Coupons</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Manage global discount codes and minimum cart spends.
                </p>
              </div>
              <Button
                onClick={() => setIsCouponModalOpen(true)}
                className="gap-2 text-xs font-bold"
              >
                <Plus className="w-4 h-4" /> Create Coupon
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {couponsList.map((c) => (
                <div
                  key={c.id}
                  className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3 relative flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono font-black text-base text-slate-900 tracking-wider">
                        {c.code}
                      </span>
                      <Badge variant={c.isActive ? 'success' : 'danger'} size="sm">
                        {c.isActive ? 'ACTIVE' : 'DISABLED'}
                      </Badge>
                    </div>
                    <p className="text-xs font-bold text-slate-700">{c.value}% OFF</p>
                    <p className="text-xs text-slate-500 mt-1">{c.description}</p>
                    {c.minPurchaseAmount && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        Min Spend: ${c.minPurchaseAmount}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => handleToggleCoupon(c.code)}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      {c.isActive ? 'Disable Code' : 'Enable Code'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Create Coupon Modal */}
      <Modal
        isOpen={isCouponModalOpen}
        onClose={() => setIsCouponModalOpen(false)}
        title="Create Promotional Coupon"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateCoupon} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-900 mb-1">Coupon Code *</label>
            <input
              required
              type="text"
              placeholder="e.g. SUMMER20"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              className="w-full p-2.5 border border-slate-300 rounded-xl outline-none font-mono uppercase font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">Discount % *</label>
              <input
                required
                type="number"
                value={newDiscount}
                onChange={(e) => setNewDiscount(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 mb-1">Min Spend ($)</label>
              <input
                type="number"
                value={newMinSpend}
                onChange={(e) => setNewMinSpend(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCouponModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Activate Coupon
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
