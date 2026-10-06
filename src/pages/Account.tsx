import React, { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Package,
  Heart,
  MapPin,
  Bell,
  Shield,
  LogOut,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Download,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  Truck,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useCartStore } from '../store/cartStore';
import { useUIStore } from '../store/uiStore';
import { ordersService } from '../services/orders/ordersService';
import { authService } from '../services/auth/authService';
import { wishlistService } from '../services/wishlist/wishlistService';
import { Order, Address, Product, OrderStatus } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ProductCard } from '../components/product/ProductCard';

export const Account: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, updateUserProfile } = useAuthStore();
  const { productIds, clearWishlist } = useWishlistStore();
  const addItem = useCartStore((state) => state.addItem);
  const { addToast } = useUIStore();

  const [activeTab, setActiveTab] = useState<
    'profile' | 'orders' | 'addresses' | 'wishlist' | 'security'
  >('profile');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderFilter, setOrderFilter] = useState<'ALL' | OrderStatus>('ALL');

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressFormData, setAddressFormData] = useState<Partial<Address>>({
    fullName: '',
    phone: '',
    street1: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
    label: 'Home',
    isDefault: false,
  });

  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [isCancelOrderModalOpen, setIsCancelOrderModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Found cheaper alternative');

  // Match URL route to tab
  useEffect(() => {
    if (location.pathname.includes('/orders')) setActiveTab('orders');
    else if (location.pathname.includes('/wishlist')) setActiveTab('wishlist');
    else if (location.pathname.includes('/addresses')) setActiveTab('addresses');
    else if (location.pathname.includes('/security')) setActiveTab('security');
    else setActiveTab('profile');
  }, [location.pathname]);

  // Load orders & addresses
  useEffect(() => {
    if (user) {
      ordersService.getOrders(user.id).then(setOrders);
      authService.getAddresses(user.id).then(setAddresses);
    }
  }, [user]);

  // Load wishlist products
  useEffect(() => {
    if (productIds.length > 0) {
      wishlistService.getWishlistProducts(productIds).then(setWishlistProducts);
    } else {
      setWishlistProducts([]);
    }
  }, [productIds]);

  if (!isAuthenticated || !user) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Please log in to access your account</h2>
        <Link to="/login">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  // Address Handlers
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const saved = await authService.saveAddress({
      ...addressFormData,
      userId: user.id,
    } as any);
    const updated = await authService.getAddresses();
    setAddresses(updated);
    setIsAddressModalOpen(false);
    addToast('Address successfully saved', 'success');
  };

  const handleDeleteAddress = async (id: string) => {
    await authService.deleteAddress(id);
    setAddresses(addresses.filter((a) => a.id !== id));
    addToast('Address deleted', 'info');
  };

  // Order Cancellation Handler
  const handleConfirmCancelOrder = async () => {
    if (!selectedOrder) return;
    try {
      const updated = await ordersService.cancelOrder(selectedOrder.id, cancelReason);
      setSelectedOrder(updated);
      setOrders(orders.map((o) => (o.id === updated.id ? updated : o)));
      setIsCancelOrderModalOpen(false);
      addToast(`Order ${updated.orderNumber} was cancelled.`, 'info');
    } catch (err) {
      addToast('Failed to cancel order', 'error');
    }
  };

  const filteredOrders = orders.filter((o) =>
    orderFilter === 'ALL' ? true : o.status === orderFilter,
  );

  return (
    <div className="container mx-auto px-4 py-10 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar Menu (3 Columns) */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 sticky top-24">
            {/* User Avatar Mini Profile */}
            <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-md">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
                <Badge variant="purple" size="sm" className="mt-1">
                  Customer Account
                </Badge>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="space-y-1 text-xs font-bold">
              <button
                onClick={() => {
                  setActiveTab('profile');
                  setSelectedOrder(null);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors text-left ${
                  activeTab === 'profile'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <UserIcon className="w-4 h-4" /> Personal Profile
              </button>

              <button
                onClick={() => {
                  setActiveTab('orders');
                  setSelectedOrder(null);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors text-left ${
                  activeTab === 'orders'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4" /> Order History
                </div>
                <span className="bg-slate-200/80 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {orders.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('addresses');
                  setSelectedOrder(null);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors text-left ${
                  activeTab === 'addresses'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <MapPin className="w-4 h-4" /> Address Book ({addresses.length})
              </button>

              <button
                onClick={() => {
                  setActiveTab('wishlist');
                  setSelectedOrder(null);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors text-left ${
                  activeTab === 'wishlist'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Heart className="w-4 h-4" /> Wishlist
                </div>
                <span className="bg-slate-200/80 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {productIds.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('security');
                  setSelectedOrder(null);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors text-left ${
                  activeTab === 'security'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Shield className="w-4 h-4" /> Security & Passwords
              </button>

              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors text-left font-bold"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </nav>
          </div>
        </div>

        {/* Right Content Area (9 Columns) */}
        <div className="lg:col-span-9">
          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Personal Information</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Manage your personal details and communication preferences.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">First Name</label>
                  <input
                    type="text"
                    defaultValue={user.firstName}
                    onChange={(e) => updateUserProfile({ firstName: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Last Name</label>
                  <input
                    type="text"
                    defaultValue={user.lastName}
                    onChange={(e) => updateUserProfile({ lastName: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    defaultValue={user.email}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    defaultValue={user.phone}
                    onChange={(e) => updateUserProfile({ phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <Button onClick={() => addToast('Profile details updated!', 'success')}>
                  Save Profile Updates
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: ORDERS LIST & ORDER DETAILS */}
          {activeTab === 'orders' && !selectedOrder && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Your Marketplace Orders</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Track dispatches, inspect carrier milestones, and request invoice receipts.
                  </p>
                </div>

                {/* Filter by status */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar bg-slate-100 p-1 rounded-xl">
                  {['ALL', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setOrderFilter(st as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                        orderFilter === st
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {st.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {filteredOrders.length > 0 ? (
                <div className="space-y-4">
                  {filteredOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:border-slate-300 transition-all space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-100 gap-2 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {order.orderNumber}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              order.status === 'DELIVERED'
                                ? 'success'
                                : order.status === 'SHIPPED'
                                  ? 'primary'
                                  : order.status === 'CANCELLED'
                                    ? 'danger'
                                    : 'warning'
                            }
                            size="sm"
                          >
                            {order.status.replace(/_/g, ' ')}
                          </Badge>
                          <span className="font-extrabold text-slate-900 text-sm">
                            ${order.total.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Items previews */}
                      <div className="space-y-3">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-4 text-xs">
                            <img
                              src={item.productImage}
                              alt=""
                              className="w-12 h-12 rounded-xl object-cover bg-slate-100 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900 truncate">
                                {item.productTitle}
                              </p>
                              <p className="text-slate-400">
                                Seller: {item.vendorName} • Qty: {item.quantity}
                              </p>
                            </div>
                            <span className="font-bold text-slate-900">
                              ${item.subtotal.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">
                          Carrier: <strong>{order.carrier}</strong> ({order.trackingNumber})
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedOrder(order)}
                          className="font-bold text-xs"
                        >
                          View Tracking Timeline & Invoice
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
                  <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <h3 className="text-base font-bold text-slate-900 mb-1">No orders found</h3>
                  <p className="text-xs text-slate-500 mb-6">
                    You have not placed any orders matching this status filter yet.
                  </p>
                  <Link to="/shop">
                    <Button size="sm">Explore Collections</Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* TAB 2 DETAIL VIEW: SINGLE ORDER TIMELINE & INVOICE */}
          {activeTab === 'orders' && selectedOrder && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-xs font-bold text-blue-600 hover:underline mb-1 block"
                  >
                    ← Back to All Orders
                  </button>
                  <h2 className="text-2xl font-black text-slate-900">
                    Order #{selectedOrder.orderNumber}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addToast('Generating invoice PDF receipt...', 'info')}
                    className="gap-1.5 text-xs font-bold"
                  >
                    <Download className="w-3.5 h-3.5" /> Invoice PDF
                  </Button>
                  {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'DELIVERED' && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setIsCancelOrderModalOpen(true)}
                      className="text-xs font-bold"
                    >
                      Cancel Order
                    </Button>
                  )}
                </div>
              </div>

              {/* Status Timeline */}
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" /> Carrier Shipment Progress
                </h3>
                <div className="space-y-4">
                  {selectedOrder.timeline.map((event, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {event.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : event.current ? (
                          <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span
                            className={`font-bold ${event.completed ? 'text-slate-900' : 'text-slate-400'}`}
                          >
                            {event.title}
                          </span>
                          <span className="text-[11px] text-slate-400">{event.date}</span>
                        </div>
                        <p className="text-slate-500 mt-0.5">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Items Breakdown */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3">Purchased Items</h3>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl p-4">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="py-3 flex items-center gap-4 text-xs">
                      <img
                        src={item.productImage}
                        alt=""
                        className="w-14 h-14 rounded-xl object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900">{item.productTitle}</p>
                        <p className="text-slate-500">
                          Vendor: <strong>{item.vendorName}</strong>{' '}
                          {item.variantName && `• ${item.variantName}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 block">
                          ${item.unitPrice.toFixed(2)} × {item.quantity}
                        </span>
                        <span className="font-extrabold text-slate-900">
                          ${item.subtotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Totals */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 max-w-sm ml-auto space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>${selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount:</span>
                    <span>-${selectedOrder.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Shipping:</span>
                  <span>${selectedOrder.shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax:</span>
                  <span>${selectedOrder.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span>${selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ADDRESSES */}
          {activeTab === 'addresses' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Saved Addresses</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage delivery destinations for faster 1-click marketplace checkout.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setAddressFormData({
                      fullName: `${user.firstName} ${user.lastName}`,
                      phone: user.phone || '',
                      country: 'United States',
                      label: 'Home',
                    });
                    setIsAddressModalOpen(true);
                  }}
                  className="gap-1.5 font-bold"
                >
                  <Plus className="w-4 h-4" /> Add Address
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="p-5 border border-slate-200 rounded-2xl bg-white space-y-3 relative flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-900">{addr.fullName}</span>
                        {addr.isDefault && (
                          <Badge variant="success" size="sm">
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {addr.street1} {addr.street2 && `, ${addr.street2}`}
                      </p>
                      <p className="text-xs text-slate-600">
                        {addr.city}, {addr.state} {addr.postalCode}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">{addr.phone}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-semibold">{addr.label}</span>
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: WISHLIST */}
          {activeTab === 'wishlist' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Your Saved Wishlist</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Keep track of items you plan to purchase or gift.
                  </p>
                </div>
                {productIds.length > 0 && (
                  <button
                    onClick={clearWishlist}
                    className="text-xs font-bold text-slate-400 hover:text-rose-600"
                  >
                    Clear Wishlist
                  </button>
                )}
              </div>

              {wishlistProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wishlistProducts.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
                  <Heart className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    Your wishlist is empty
                  </h3>
                  <p className="text-xs text-slate-500 mb-6">
                    Browse artisanal audio, selvedge denim, or ceramics and click the heart icon.
                  </p>
                  <Link to="/shop">
                    <Button size="sm">Browse Catalog</Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SECURITY */}
          {activeTab === 'security' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-6 max-w-xl">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Security & Credentials</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Update password authentication and session security.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">Current Password</label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-900 mb-1">New Password</label>
                  <input
                    type="password"
                    placeholder="Minimum 8 characters"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none"
                  />
                </div>
                <Button
                  onClick={() => addToast('Password successfully updated!', 'success')}
                  className="font-bold"
                >
                  Update Password
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Address Modal */}
      <Modal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        title="Add Delivery Address"
        maxWidth="md"
      >
        <form onSubmit={handleSaveAddress} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Full Name *</label>
              <input
                required
                type="text"
                value={addressFormData.fullName || ''}
                onChange={(e) =>
                  setAddressFormData({ ...addressFormData, fullName: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Phone *</label>
              <input
                required
                type="tel"
                value={addressFormData.phone || ''}
                onChange={(e) => setAddressFormData({ ...addressFormData, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">Street Address *</label>
            <input
              required
              type="text"
              value={addressFormData.street1 || ''}
              onChange={(e) => setAddressFormData({ ...addressFormData, street1: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">City *</label>
              <input
                required
                type="text"
                value={addressFormData.city || ''}
                onChange={(e) => setAddressFormData({ ...addressFormData, city: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">State *</label>
              <input
                required
                type="text"
                value={addressFormData.state || ''}
                onChange={(e) => setAddressFormData({ ...addressFormData, state: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Zip *</label>
              <input
                required
                type="text"
                value={addressFormData.postalCode || ''}
                onChange={(e) =>
                  setAddressFormData({ ...addressFormData, postalCode: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 pt-2">
            <input
              type="checkbox"
              checked={Boolean(addressFormData.isDefault)}
              onChange={(e) =>
                setAddressFormData({ ...addressFormData, isDefault: e.target.checked })
              }
              className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            <span>Set as default shipping address</span>
          </label>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddressModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save Address
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Order Modal */}
      <Modal
        isOpen={isCancelOrderModalOpen}
        onClose={() => setIsCancelOrderModalOpen(false)}
        title="Cancel Order Confirmation"
        maxWidth="sm"
      >
        <div className="p-6 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Are you sure you want to cancel order <strong>{selectedOrder?.orderNumber}</strong>? Any
            pre-authorized escrow payments will be released immediately.
          </p>

          <div>
            <label className="block font-bold text-slate-900 mb-1">Reason for cancellation</label>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-xl outline-none"
            >
              <option value="Changed my mind">Changed my mind</option>
              <option value="Ordered by mistake">Ordered by mistake</option>
              <option value="Found alternative">Found alternative item</option>
              <option value="Delivery time too long">Delivery estimate too long</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsCancelOrderModalOpen(false)}>
              Keep Order
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmCancelOrder}>
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
