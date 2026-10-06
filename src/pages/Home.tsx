import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Clock,
  Sparkles,
  Store,
  Flame,
  CheckCircle2,
  Mail,
  Star,
} from 'lucide-react';
import { productsService } from '../services/products/productsService';
import { categoriesService } from '../services/categories/categoriesService';
import { vendorsService } from '../services/vendors/vendorsService';
import { Product, Category, Vendor } from '../types';
import { ProductCard } from '../components/product/ProductCard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useUIStore } from '../store/uiStore';

export const Home: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [flashDeals, setFlashDeals] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredVendors, setFeaturedVendors] = useState<Vendor[]>([]);
  const [activeTab, setActiveTab] = useState<'trending' | 'bestSellers' | 'newArrivals'>(
    'trending',
  );
  const [isLoading, setIsLoading] = useState(true);

  // Newsletter state
  const [emailInput, setEmailInput] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const { addToast } = useUIStore();

  // Flash deal countdown mock (e.g. 18 hours 42 mins 10 secs)
  const [timeLeft, setTimeLeft] = useState({ hours: 18, minutes: 42, seconds: 15 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadHomeData = async () => {
      setIsLoading(true);
      try {
        const [feat, best, news, flash, cats, vends] = await Promise.all([
          productsService.getFeaturedProducts(4),
          productsService.getBestSellers(4),
          productsService.getNewArrivals(4),
          productsService.getFlashDeals(),
          categoriesService.getCategories(),
          vendorsService.getVendors(),
        ]);
        setFeaturedProducts(feat);
        setBestSellers(best);
        setNewArrivals(news);
        setFlashDeals(flash);
        setCategories(cats);
        setFeaturedVendors(vends.slice(0, 3));
      } catch (err) {
        console.error('Failed to load home data', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadHomeData();
  }, []);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      addToast('Please enter a valid email address', 'error');
      return;
    }
    setIsSubscribing(true);
    setTimeout(() => {
      setIsSubscribing(false);
      setEmailInput('');
      addToast('Welcome to Rudin! Check your inbox for your 15% welcome code.', 'success');
    }, 400);
  };

  const currentTabProducts =
    activeTab === 'trending'
      ? featuredProducts
      : activeTab === 'bestSellers'
        ? bestSellers
        : newArrivals;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-slate-950 text-white overflow-hidden py-16 lg:py-24">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=2000"
            alt="Artisanal craft"
            className="w-full h-full object-cover opacity-25 filter blur-[1px]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-semibold text-slate-200 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Independent Creator Marketplace</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-white">
              Exceptional goods. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-200">
                Independent makers.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
              Connect directly with verified independent sound laboratories, heritage textile
              ateliers, and ceramic master craftspeople worldwide.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link to="/shop">
                <Button
                  size="lg"
                  className="bg-white text-slate-950 hover:bg-slate-100 font-bold px-7 h-12 shadow-xl shadow-white/5"
                >
                  Explore Catalog
                </Button>
              </Link>
              <Link to="/vendors">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-700 text-white hover:bg-slate-800/80 backdrop-blur font-semibold px-6 h-12"
                >
                  Meet the Makers
                </Button>
              </Link>
            </div>

            {/* Micro proof metrics */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-800/80 max-w-md">
              <div>
                <p className="text-2xl font-black text-white">100%</p>
                <p className="text-xs text-slate-400">Verified Artisans</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">4.9★</p>
                <p className="text-xs text-slate-400">Customer Satisfaction</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">Carbon-0</p>
                <p className="text-xs text-slate-400">Neutral Deliveries</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Guarantees Strip */}
      <section className="bg-white border-b border-slate-200 py-6">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 flex-shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Complimentary Shipping</h4>
                <p className="text-[11px] text-slate-500">On all vendor orders over $75</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Artisan Authenticity</h4>
                <p className="text-[11px] text-slate-500">Every store individually audited</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 flex-shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">30-Day At-Home Trial</h4>
                <p className="text-[11px] text-slate-500">Hassle-free prepaid returns</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Direct Maker Care</h4>
                <p className="text-[11px] text-slate-500">Chat directly with the creator</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Discovery Grid */}
      <section className="py-14 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-bold tracking-wider text-blue-600 uppercase">
                Curated Departments
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                Shop by Craft & Discipline
              </h2>
            </div>
            <Link
              to="/shop"
              className="text-xs font-bold text-slate-900 hover:text-blue-600 flex items-center gap-1 group"
            >
              Browse All Categories{' '}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/categories/${cat.slug}`}
                className="group relative bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 mb-3">
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                    {cat.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {cat.productCount} artisanal items
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Limited-Time Flash Deal Section */}
      {flashDeals.length > 0 && (
        <section className="py-12 bg-white border-y border-slate-200">
          <div className="container mx-auto px-4">
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl text-white p-6 sm:p-10 relative overflow-hidden shadow-xl">
              <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-15 pointer-events-none hidden lg:block">
                <img
                  src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1200"
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="max-w-xl space-y-4 relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold">
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  <span>Limited Studio Release Deal</span>
                </div>

                <h3 className="text-2xl sm:text-4xl font-black tracking-tight">
                  Aether Apex Headphones: 15% Launch Special
                </h3>

                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Planar magnetic accuracy, custom Copenhagen acoustic tuning, and 45-hour battery
                  endurance. Strictly limited allocation remaining.
                </p>

                {/* Countdown Timer */}
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-xs font-semibold text-slate-400">Offer closes in:</span>
                  <div className="flex items-center gap-2 text-center font-mono font-bold text-sm">
                    <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg">
                      <span className="text-base text-white">
                        {String(timeLeft.hours).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] text-slate-400 block -mt-1 font-sans">HRS</span>
                    </div>
                    <span>:</span>
                    <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg">
                      <span className="text-base text-white">
                        {String(timeLeft.minutes).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] text-slate-400 block -mt-1 font-sans">MIN</span>
                    </div>
                    <span>:</span>
                    <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg">
                      <span className="text-base text-amber-400">
                        {String(timeLeft.seconds).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] text-slate-400 block -mt-1 font-sans">SEC</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <Link to="/product/aether-apex-wireless-anc-headphones">
                    <Button className="bg-white text-slate-950 hover:bg-slate-100 font-bold px-6 h-11">
                      Claim Flash Offer ($349.00)
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Product Discovery Tabs (Trending, Best Sellers, New Arrivals) */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-bold tracking-wider text-blue-600 uppercase">
                Featured Catalog
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                Explore Top Picks
              </h2>
            </div>

            {/* Tabs Switcher */}
            <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('trending')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'trending'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Trending Now
              </button>
              <button
                onClick={() => setActiveTab('bestSellers')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'bestSellers'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Best Sellers
              </button>
              <button
                onClick={() => setActiveTab('newArrivals')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'newArrivals'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                New Releases
              </button>
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {currentTabProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link to="/shop">
              <Button
                size="lg"
                variant="outline"
                className="border-slate-300 text-slate-900 font-bold px-8"
              >
                View Entire Marketplace Catalog
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Multi-Vendor Spotlight Section */}
      <section className="py-16 bg-white border-y border-slate-200">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-bold tracking-wider text-blue-600 uppercase">
                Artisan Network
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                Featured Independent Stores
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Support small studios, independent labs, and multi-generational family ateliers.
              </p>
            </div>
            <Link
              to="/vendors"
              className="text-xs font-bold text-slate-900 hover:text-blue-600 flex items-center gap-1 group"
            >
              All Verified Stores{' '}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredVendors.map((vendor) => (
              <div
                key={vendor.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="relative h-32 bg-slate-100 overflow-hidden">
                  <img
                    src={vendor.bannerUrl}
                    alt={vendor.storeName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-slate-900/20" />
                </div>

                <div className="p-5 pt-0 flex-1 flex flex-col relative">
                  <div className="-mt-7 mb-3 flex items-end justify-between">
                    <img
                      src={vendor.logoUrl}
                      alt={vendor.storeName}
                      className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow-md bg-white"
                    />
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-900 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{vendor.rating.toFixed(2)}</span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    {vendor.storeName}
                    {vendor.isVerified && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 fill-blue-50" />
                    )}
                  </h3>

                  <p className="text-xs text-slate-500 mb-2 font-medium">{vendor.location}</p>

                  <p className="text-xs text-slate-600 line-clamp-3 mb-5 leading-relaxed flex-1">
                    {vendor.description}
                  </p>

                  <Link to={`/vendors/${vendor.slug}`} className="mt-auto">
                    <Button variant="outline" className="w-full text-xs font-bold border-slate-200">
                      Visit Storefront
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Subscription Strip */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="container mx-auto px-4 max-w-4xl text-center space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-blue-400">
            <Mail className="w-6 h-6" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Stay in sync with independent releases.
          </h2>

          <p className="text-slate-300 text-sm max-w-md mx-auto">
            Get early access to limited batch runs, behind-the-scenes artisan stories, and a 15%
            discount on your first order.
          </p>

          <form
            onSubmit={handleNewsletterSubmit}
            className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
          >
            <input
              type="email"
              placeholder="Enter your email address"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-400 outline-none focus:border-slate-500"
            />
            <Button
              type="submit"
              isLoading={isSubscribing}
              className="bg-white text-slate-950 hover:bg-slate-100 font-bold h-12 px-6"
            >
              Subscribe
            </Button>
          </form>

          <p className="text-[11px] text-slate-500">
            Zero spam. Unsubscribe at any time. We respect your privacy.
          </p>
        </div>
      </section>
    </div>
  );
};
