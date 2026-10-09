import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Package,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Truck,
  Settings,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import { mockOrders, mockVendors } from '../data/mockData';
import { Product, Order } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';

export const SellerDashboard: React.FC = () => {
  const currentVendor = mockVendors[0]; // Aether Acoustic Labs
  const [vendorProducts, setVendorProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'products' | 'orders' | 'payouts' | 'settings'
  >('overview');

  // Add Product Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('199.00');
  const [newStock, setNewStock] = useState('25');
  const [newImage, setNewImage] = useState(
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=800',
  );
  const [newDesc, setNewDesc] = useState('');

  // Seller Orders
  const [sellerOrders, setSellerOrders] = useState<Order[]>(mockOrders);

  const { addToast } = useUIStore();
  const accessToken = useAuthStore((state) => state.accessToken);
  const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

  useEffect(() => {
    if (!accessToken) {
      setVendorProducts([]);
      return;
    }
    let cancelled = false;
    fetch(`${apiBaseUrl}/api/products/mine`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error?.message || 'Unable to load your products.');
        return payload.products as Product[];
      })
      .then((products) => { if (!cancelled) setVendorProducts(products); })
      .catch((error: unknown) => { if (!cancelled) addToast(error instanceof Error ? error.message : 'Unable to load products.', 'error'); });
    return () => { cancelled = true; };
  }, [accessToken, addToast, apiBaseUrl]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      addToast('Sign in with an approved seller account to manage real products.', 'error');
      return;
    }
    const price = Number(newPrice);
    const stock = Number(newStock);
    if (!newTitle.trim() || !newDesc.trim() || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      addToast('Enter a title, description, non-negative price, and whole-number stock quantity.', 'error');
      return;
    }
    try {
      const response = await fetch(`${apiBaseUrl}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          categoryId: 'c1',
          title: newTitle.trim(),
          description: newDesc.trim(),
          shortDescription: newDesc.trim().slice(0, 500),
          price,
          stock,
          images: newImage.trim() ? [{ id: `img_${Date.now()}`, url: newImage.trim(), isPrimary: true, displayOrder: 0 }] : [],
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message || 'Product could not be created.');
      const createdProduct = payload.product as Product;
      setVendorProducts((products) => [createdProduct, ...products]);
      setIsAddModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      addToast('Product saved as a draft. An administrator must approve publication.', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to create product.', 'error');
    }
  };

  const handleToggleProductStatus = async (id: string) => {
    const product = vendorProducts.find((item) => item.id === id);
    if (!product) return;
    if (product.status !== 'PUBLISHED') {
      addToast('Draft products cannot be published by sellers; request administrator approval.', 'info');
      return;
    }
    if (!accessToken) return;
    try {
      const response = await fetch(`${apiBaseUrl}/api/products/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status: 'DRAFT' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message || 'Product status could not be changed.');
      setVendorProducts((products) => products.map((item) => item.id === id ? payload.product as Product : item));
      addToast('Product moved to draft.', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to update product.', 'error');
    }
  };

  const handleArchiveProduct = async (id: string) => {
    if (!accessToken) return;
    try {
      const response = await fetch(`${apiBaseUrl}/api/products/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message || 'Product could not be archived.');
      setVendorProducts((products) => products.filter((item) => item.id !== id));
      addToast('Product archived.', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to archive product.', 'error');
    }
  };

  const handleDispatchOrder = (orderId: string) => {
    setSellerOrders(
      sellerOrders.map((o) => {
        if (o.id === orderId) {
          addToast(`Order ${o.orderNumber} marked as DISPATCHED with DHL Express!`, 'success');
          return { ...o, status: 'SHIPPED' };
        }
        return o;
      }),
    );
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)] bg-slate-50">
      {/* Seller Portal Sidebar */}
      <aside className="w-full lg:w-64 bg-slate-900 text-slate-300 p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-6 border-b border-slate-800">
            <img
              src={currentVendor.logoUrl}
              alt=""
              className="w-10 h-10 rounded-xl object-cover border border-slate-700"
            />
            <div className="min-w-0">
              <h2 className="text-white font-bold text-sm truncate">{currentVendor.storeName}</h2>
              <Badge variant="purple" size="sm">
                Seller Portal
              </Badge>
            </div>
          </div>

          <nav className="space-y-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" /> Overview & Metrics
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors text-left ${
                activeTab === 'products'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4" /> My Products
              </div>
              <span className="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded font-bold">
                {vendorProducts.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors text-left ${
                activeTab === 'orders'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4" /> Customer Orders
              </div>
              <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.5 rounded font-bold">
                {sellerOrders.filter((o) => o.status === 'PROCESSING').length || 1}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('payouts')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                activeTab === 'payouts'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4" /> Earnings & Payouts
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" /> Store Settings
            </button>
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-800 text-xs text-slate-500">
          <p className="font-semibold text-slate-400">Maker Rating: 4.90 ★</p>
          <p className="text-[11px] mt-0.5">Top-Rated Artisan Status</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 sm:p-10 overflow-y-auto">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Seller Dashboard</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Sales metrics, store analytics, and fulfillment status for{' '}
                  {currentVendor.storeName}.
                </p>
              </div>

              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="gap-2 font-bold text-xs h-10"
              >
                <Plus className="w-4 h-4" /> Add New Listing
              </Button>
            </div>

            {/* Metrics KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-slate-400">Net Monthly GMV</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-900">$18,450.00</h3>
                <span className="text-[11px] font-bold text-emerald-600 mt-1 inline-block">
                  +14.2% vs last month
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-slate-400">Orders Fulfilled</span>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-900">54 orders</h3>
                <span className="text-[11px] text-slate-400 mt-1 inline-block">
                  100% on-time dispatch rate
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-slate-400">Average Order Value</span>
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-900">$341.66</h3>
                <span className="text-[11px] text-slate-400 mt-1 inline-block">
                  Premium audio acoustics
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-slate-400">Store Followers</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-900">
                  {currentVendor.followerCount}
                </h3>
                <span className="text-[11px] text-emerald-600 font-bold mt-1 inline-block">
                  +128 this week
                </span>
              </div>
            </div>

            {/* Recent Orders Section */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-slate-900">Recent Buyer Orders</h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  View all orders →
                </button>
              </div>

              <div className="divide-y divide-slate-100 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-2.5">Order ID</th>
                      <th className="py-2.5">Date</th>
                      <th className="py-2.5">Destination</th>
                      <th className="py-2.5">Total</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {sellerOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 font-mono font-bold text-slate-900">{o.orderNumber}</td>
                        <td className="py-3 text-slate-500">
                          {new Date(o.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-slate-600">
                          {o.shippingAddress.city}, {o.shippingAddress.state}
                        </td>
                        <td className="py-3 font-bold text-slate-900">${o.total.toFixed(2)}</td>
                        <td className="py-3">
                          <Badge variant={o.status === 'SHIPPED' ? 'primary' : 'warning'} size="sm">
                            {o.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">
                          {o.status !== 'SHIPPED' && (
                            <button
                              onClick={() => handleDispatchOrder(o.id)}
                              className="text-xs font-bold text-blue-600 hover:underline"
                            >
                              Dispatch Order
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTS */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900">
                  Products Catalog ({vendorProducts.length})
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Manage stock inventory, pricing, and draft/published status.
                </p>
              </div>
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="gap-2 font-bold text-xs h-10"
              >
                <Plus className="w-4 h-4" /> Add Product
              </Button>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4">Item Details</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Stock Level</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {vendorProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.images[0]?.url}
                            alt=""
                            className="w-12 h-12 rounded-xl object-cover bg-slate-100 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-900 text-sm leading-snug">
                              {p.title}
                            </p>
                            <span className="text-[11px] text-slate-400">SKU: {p.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-slate-900 text-sm">
                        ${p.price.toFixed(2)}
                      </td>
                      <td className="p-4 font-semibold">{p.stock} units</td>
                      <td className="p-4">
                        <Badge
                          variant={p.status === 'PUBLISHED' ? 'success' : 'secondary'}
                          size="sm"
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleToggleProductStatus(p.id)}
                          className="text-xs font-bold text-blue-600 hover:underline"
                        >
                          {p.status === 'PUBLISHED' ? 'Unpublish' : 'Pending approval'}
                        </button>
                        <button
                          onClick={() => handleArchiveProduct(p.id)}
                          className="text-xs font-bold text-red-600 hover:underline"
                        >
                          Archive
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-black text-slate-900">Vendor Fulfillment Orders</h1>
            <div className="space-y-4">
              {sellerOrders.map((o) => (
                <div
                  key={o.id}
                  className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4"
                >
                  <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-100">
                    <span className="font-mono font-bold text-sm text-slate-900">
                      {o.orderNumber}
                    </span>
                    <Badge variant={o.status === 'SHIPPED' ? 'success' : 'warning'} size="sm">
                      {o.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p>
                      <strong>Ship to:</strong> {o.shippingAddress.fullName} —{' '}
                      {o.shippingAddress.street1}, {o.shippingAddress.city}
                    </p>
                    <p>
                      <strong>Shipping Level:</strong> {o.shippingMethod}
                    </p>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                    <span className="text-sm font-black text-slate-900">
                      Total: ${o.total.toFixed(2)}
                    </span>
                    {o.status !== 'SHIPPED' && (
                      <Button
                        size="sm"
                        onClick={() => handleDispatchOrder(o.id)}
                        className="font-bold text-xs"
                      >
                        Mark Dispatched (Generate Label)
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: PAYOUTS */}
        {activeTab === 'payouts' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6 max-w-2xl">
            <h2 className="text-2xl font-black text-slate-900">Escrow Balance & Payouts</h2>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-400 font-semibold">Available for Bank Transfer</p>
                <p className="text-3xl font-black text-slate-900">$6,480.00</p>
              </div>
              <Button
                size="sm"
                onClick={() => addToast('Payout initiated to registered IBAN.', 'success')}
              >
                Request Payout Now
              </Button>
            </div>
            <div className="text-xs text-slate-500 leading-relaxed">
              Payouts are disbursed every Friday directly to your verified commercial account after
              delivery confirmation.
            </div>
          </div>
        )}

        {/* TAB 5: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6 max-w-2xl">
            <h2 className="text-2xl font-black text-slate-900">Store Profile Settings</h2>
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-900 mb-1">Storefront Name</label>
                <input
                  type="text"
                  defaultValue={currentVendor.storeName}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-900 mb-1">Workshop Location</label>
                <input
                  type="text"
                  defaultValue={currentVendor.location}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-900 mb-1">Store Narrative & Bio</label>
                <textarea
                  rows={3}
                  defaultValue={currentVendor.description}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>
              <Button onClick={() => addToast('Store policies saved successfully!', 'success')}>
                Save Settings
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Product to Store Catalog"
        maxWidth="md"
      >
        <form onSubmit={handleAddProduct} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-900 mb-1">Product Title *</label>
            <input
              required
              type="text"
              placeholder="e.g. Aether Studio Reference DAC"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-slate-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-900 mb-1">Retail Price ($) *</label>
              <input
                required
                type="number"
                step="0.01"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 mb-1">Initial Stock Units *</label>
              <input
                required
                type="number"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">Image URL</label>
            <input
              type="url"
              value={newImage}
              onChange={(e) => setNewImage(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl outline-none text-slate-600 font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">Brief Description</label>
            <textarea
              rows={3}
              placeholder="Key specifications, acoustic properties, materials..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Publish Listing
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
