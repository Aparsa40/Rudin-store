import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Star,
  Store,
  MapPin,
  Calendar,
  Heart,
  MessageSquare,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  Clock,
  Search,
} from 'lucide-react';
import { vendorsService } from '../services/vendors/vendorsService';
import { productsService } from '../services/products/productsService';
import { Vendor, Product } from '../types';
import { ProductCard } from '../components/product/ProductCard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useUIStore } from '../store/uiStore';

export const VendorDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'about' | 'policies'>('products');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [storeSearch, setStoreSearch] = useState('');
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const { addToast } = useUIStore();

  useEffect(() => {
    let active = true;
    if (!slug) return;
    setIsLoading(true);

    vendorsService.getVendorBySlug(slug).then(async (v) => {
      if (!v) {
        setIsLoading(false);
        return;
      }
      const prods = await productsService.getProductsByVendor(v.id);
      if (active) {
        setVendor(v);
        setProducts(prods);
        setFollowerCount(v.followerCount);
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [slug]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="animate-pulse space-y-4 max-w-xl mx-auto">
          <div className="h-40 bg-slate-200 rounded-3xl" />
          <div className="h-6 bg-slate-200 rounded w-1/3 mx-auto" />
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">Store Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">
          The requested vendor storefront could not be located.
        </p>
        <Link to="/vendors">
          <Button>View All Stores</Button>
        </Link>
      </div>
    );
  }

  const handleToggleFollow = () => {
    if (isFollowing) {
      setIsFollowing(false);
      setFollowerCount((prev) => prev - 1);
      addToast(`Unfollowed ${vendor.storeName}`, 'info');
    } else {
      setIsFollowing(true);
      setFollowerCount((prev) => prev + 1);
      addToast(`You are now following ${vendor.storeName}!`, 'success');
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    setIsContactModalOpen(false);
    setMessageText('');
    addToast(
      `Message dispatched to ${vendor.storeName}. Expect response in ${vendor.responseTime}.`,
      'success',
    );
  };

  const filteredProducts = products.filter((p) =>
    storeSearch
      ? p.title.toLowerCase().includes(storeSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(storeSearch.toLowerCase())
      : true,
  );

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      {/* Store Banner */}
      <div className="h-48 sm:h-64 lg:h-80 w-full relative bg-slate-900 overflow-hidden">
        <img
          src={vendor.bannerUrl}
          alt={vendor.storeName}
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
      </div>

      <div className="container mx-auto px-4 max-w-7xl">
        {/* Store Profile Card Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 -mt-20 relative z-10 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 text-center sm:text-left">
              {/* Logo */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-white flex-shrink-0">
                <img src={vendor.logoUrl} alt="" className="w-full h-full object-cover" />
              </div>

              {/* Title & Metadata */}
              <div className="space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                    {vendor.storeName}
                  </h1>
                  {vendor.isVerified && (
                    <CheckCircle2 className="w-5 h-5 text-blue-600 fill-blue-50" />
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1 font-bold text-slate-900">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{vendor.rating.toFixed(2)}</span>
                    <span className="font-normal text-slate-400">
                      ({vendor.reviewCount} reviews)
                    </span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {vendor.location}
                  </span>
                  <span>•</span>
                  <span>{followerCount.toLocaleString()} followers</span>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <Button
                variant={isFollowing ? 'secondary' : 'outline'}
                onClick={handleToggleFollow}
                className="gap-2 font-bold text-xs h-10 px-4"
              >
                <Heart
                  className={`w-3.5 h-3.5 ${isFollowing ? 'fill-rose-500 text-rose-500' : ''}`}
                />
                <span>{isFollowing ? 'Following Store' : 'Follow Store'}</span>
              </Button>

              <Button
                onClick={() => setIsContactModalOpen(true)}
                className="gap-2 font-bold text-xs h-10 px-4"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Contact Maker</span>
              </Button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100 text-center">
            <div>
              <p className="text-xs text-slate-400 font-medium">Response Time</p>
              <p className="text-sm font-bold text-slate-900">{vendor.responseTime}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Store Specialization</p>
              <p className="text-sm font-bold text-slate-900 truncate">
                {vendor.categories.join(', ')}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Member Since</p>
              <p className="text-sm font-bold text-slate-900">
                {new Date(vendor.createdAt).getFullYear()}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Fulfillment Type</p>
              <p className="text-sm font-bold text-emerald-700">Studio Handcrafted</p>
            </div>
          </div>
        </div>

        {/* Store Tabs */}
        <div className="flex border-b border-slate-200 mb-8 bg-white rounded-2xl px-4 shadow-sm">
          <button
            onClick={() => setActiveTab('products')}
            className={`py-4 px-6 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'products'
                ? 'border-b-2 border-slate-900 text-slate-900'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Store Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`py-4 px-6 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'about'
                ? 'border-b-2 border-slate-900 text-slate-900'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            About Maker & Studio
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={`py-4 px-6 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'policies'
                ? 'border-b-2 border-slate-900 text-slate-900'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Shipping & Return Policies
          </button>
        </div>

        {/* TAB CONTENT */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* Search within store */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative max-w-sm w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder={`Search within ${vendor.storeName}...`}
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-slate-400"
                />
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {filteredProducts.length} items available
              </p>
            </div>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="p-12 bg-white border border-slate-200 rounded-3xl text-center">
                <p className="text-xs text-slate-500">No items matched "{storeSearch}".</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'about' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-sm max-w-3xl space-y-6">
            <h2 className="text-xl font-black text-slate-900">Studio Story & Craft Philosophy</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{vendor.description}</p>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Audited & Verified Maker
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Rudin marketplace curators physically inspect materials, workshop working
                conditions, and product durability before granting verification badges to
                independent sellers.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'policies' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-sm max-w-3xl space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" /> Shipping Guidelines
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">{vendor.policies.shipping}</p>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-blue-600" /> Return & Exchange Policy
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">{vendor.policies.returns}</p>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" /> Workshop Dispatch Schedule
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {vendor.policies.processingTime}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Contact Maker Modal */}
      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title={`Message ${vendor.storeName}`}
        maxWidth="md"
      >
        <form onSubmit={handleSendMessage} className="p-6 space-y-4">
          <p className="text-xs text-slate-500">
            Send an inquiry directly to the creators in {vendor.location}. Average reply time is{' '}
            {vendor.responseTime}.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">Your Inquiry</label>
            <textarea
              required
              rows={4}
              placeholder="Ask about custom finishes, sizing measurements, or material sourcing..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-slate-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsContactModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Send Direct Message
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
