import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star,
  Heart,
  Shield,
  Truck,
  Share2,
  Plus,
  Minus,
  ShoppingBag,
  Zap,
  CheckCircle2,
  Store,
  Clock,
  RotateCcw,
  Sparkles,
  MessageSquare,
  ThumbsUp,
} from 'lucide-react';
import { productsService } from '../services/products/productsService';
import { vendorsService } from '../services/vendors/vendorsService';
import { reviewsService } from '../services/reviews/reviewsService';
import { Product, Vendor, ProductVariant, Review, RatingBreakdown } from '../types';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useUIStore } from '../store/uiStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { RatingStars } from '../components/ui/RatingStars';
import { Modal } from '../components/ui/Modal';
import { ProductCard } from '../components/product/ProductCard';

export const ProductDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [breakdown, setBreakdown] = useState<RatingBreakdown | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [frequentlyBought, setFrequentlyBought] = useState<Product[]>([]);
  const [bundleChecked, setBundleChecked] = useState<Record<string, boolean>>({});

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'specs' | 'desc' | 'shipping' | 'reviews'>('specs');
  const [isLoading, setIsLoading] = useState(true);

  // Write Review Modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const addItem = useCartStore((state) => state.addItem);
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const { addToast } = useUIStore();

  useEffect(() => {
    let active = true;
    const fetchFullProduct = async () => {
      setIsLoading(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      try {
        if (!slug) return;
        const p = await productsService.getProductBySlug(slug);
        if (!p) {
          setIsLoading(false);
          return;
        }

        const [v, revs, bdown, related, bundle] = await Promise.all([
          vendorsService.getVendorById(p.vendorId),
          reviewsService.getProductReviews(p.id),
          reviewsService.getRatingBreakdown(p.id),
          productsService.getRelatedProducts(p.id, 4),
          productsService.getFrequentlyBoughtTogether(p.id),
        ]);

        if (active) {
          setProduct(p);
          setVendor(v);
          setReviews(revs);
          setBreakdown(bdown);
          setRelatedProducts(related);
          setFrequentlyBought(bundle);

          setSelectedImageIdx(0);
          setSelectedVariant(p.variants[0] || null);
          setQuantity(1);

          // Check bundle items by default
          const bundleMap: Record<string, boolean> = {};
          bundle.forEach((b) => {
            bundleMap[b.id] = true;
          });
          setBundleChecked(bundleMap);

          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load product details', err);
        setIsLoading(false);
      }
    };

    fetchFullProduct();
    return () => {
      active = false;
    };
  }, [slug]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="animate-pulse space-y-8">
          <div className="h-4 bg-slate-200 rounded w-1/4" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="aspect-square bg-slate-200 rounded-3xl" />
            <div className="space-y-4">
              <div className="h-6 bg-slate-200 rounded w-1/3" />
              <div className="h-10 bg-slate-200 rounded w-3/4" />
              <div className="h-8 bg-slate-200 rounded w-1/4" />
              <div className="h-24 bg-slate-200 rounded w-full" />
              <div className="h-12 bg-slate-200 rounded w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Product Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">
          The requested item may have been discontinued or moved.
        </p>
        <Link to="/shop">
          <Button>Back to Catalog</Button>
        </Link>
      </div>
    );
  }

  const currentVariant = selectedVariant || product.variants[0] || null;
  const price = currentVariant ? currentVariant.price : product.price;
  const comparePrice = currentVariant ? currentVariant.compareAtPrice : product.compareAtPrice;
  const hasDiscount = comparePrice && comparePrice > price;
  const inWishlist = isInWishlist(product.id);
  const stock = currentVariant ? currentVariant.stockQuantity : product.stock;

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      variantId: currentVariant?.id,
      quantity,
    });
    addToast(`Added ${quantity}x "${product.title}" to cart`, 'success');
  };

  const handleBuyNow = () => {
    addItem({
      productId: product.id,
      variantId: currentVariant?.id,
      quantity,
    });
    navigate('/checkout');
  };

  const handleToggleWishlist = () => {
    const added = toggleWishlist(product.id);
    addToast(added ? `Added "${product.title}" to wishlist` : `Removed from wishlist`, 'info');
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    addToast('Product link copied to clipboard!', 'info');
  };

  // Add bundled items to cart
  const handleAddBundleToCart = () => {
    // Add current product
    addItem({ productId: product.id, variantId: currentVariant?.id, quantity: 1 });
    // Add checked bundle products
    frequentlyBought.forEach((b) => {
      if (bundleChecked[b.id]) {
        addItem({ productId: b.id, variantId: b.variants[0]?.id, quantity: 1 });
      }
    });
    addToast('Added selected bundle items to cart!', 'success');
  };

  const bundleTotal =
    price +
    frequentlyBought.filter((b) => bundleChecked[b.id]).reduce((sum, b) => sum + b.price, 0);

  // Review submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTitle.trim() || !reviewComment.trim()) {
      addToast('Please fill out all review fields', 'error');
      return;
    }
    setIsSubmittingReview(true);
    const newRev = await reviewsService.addReview({
      productId: product.id,
      userId: 'u1',
      userName: 'Alex Morgan',
      rating: reviewRating,
      title: reviewTitle,
      comment: reviewComment,
      isVerifiedPurchase: true,
    });
    setReviews([newRev, ...reviews]);
    setIsSubmittingReview(false);
    setIsReviewModalOpen(false);
    setReviewTitle('');
    setReviewComment('');
    addToast('Thank you! Your verified review has been published.', 'success');
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 mb-6">
        <Link to="/" className="hover:text-slate-700">
          Home
        </Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-slate-700">
          Catalog
        </Link>
        <span>/</span>
        {vendor && (
          <>
            <Link to={`/vendors/${vendor.slug}`} className="hover:text-slate-700">
              {vendor.storeName}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-slate-900 font-bold truncate max-w-xs">{product.title}</span>
      </nav>

      {/* Main Product Showcase Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16">
        {/* Left Gallery (7 Columns on Large) */}
        <div className="lg:col-span-7 flex flex-col-reverse md:flex-row gap-4">
          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex md:flex-col gap-3 overflow-x-auto md:w-20 flex-shrink-0 no-scrollbar">
              {product.images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImageIdx(idx)}
                  className={`w-18 h-18 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                    selectedImageIdx === idx
                      ? 'border-slate-900 shadow-md scale-95'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Primary View with Zoom Lens */}
          <div
            className="flex-1 bg-slate-100 rounded-3xl overflow-hidden relative aspect-square border border-slate-200 cursor-crosshair group"
            onMouseEnter={() => setIsZoomed(true)}
            onMouseLeave={() => setIsZoomed(false)}
            onMouseMove={handleMouseMove}
          >
            {hasDiscount && (
              <div className="absolute top-4 left-4 z-10">
                <Badge variant="danger" size="md">
                  SAVE {Math.round((1 - price / comparePrice!) * 100)}%
                </Badge>
              </div>
            )}

            <img
              src={product.images[selectedImageIdx]?.url}
              alt={product.title}
              className={`w-full h-full object-cover transition-transform duration-200 ${
                isZoomed ? 'scale-150' : 'scale-100'
              }`}
              style={isZoomed ? { transformOrigin: `${mousePos.x}% ${mousePos.y}%` } : undefined}
            />

            <div className="absolute bottom-3 right-3 text-[11px] font-semibold bg-white/80 backdrop-blur px-2.5 py-1 rounded-lg text-slate-600 pointer-events-none">
              Hover to Zoom
            </div>
          </div>
        </div>

        {/* Right Product Buy Box (5 Columns) */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Vendor & Rating Header */}
            <div className="flex items-center justify-between">
              {vendor && (
                <Link
                  to={`/vendors/${vendor.slug}`}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 group"
                >
                  <Store className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                  <span>{vendor.storeName}</span>
                  {vendor.isVerified && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded font-bold">
                      Verified
                    </span>
                  )}
                </Link>
              )}

              <Badge variant={stock > 0 ? 'success' : 'danger'} size="sm">
                {stock > 0 ? `In Stock (${stock} ready to ship)` : 'Out of Stock'}
              </Badge>
            </div>

            {/* Product Title */}
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {product.title}
            </h1>

            {/* Rating Stars & Quick Link to Reviews */}
            <div className="flex items-center gap-3">
              <RatingStars rating={product.rating} reviewCount={product.reviewCount} size="sm" />
              <button
                onClick={() => setActiveTab('reviews')}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                Read all reviews
              </button>
            </div>

            {/* Price Row */}
            <div className="flex items-baseline gap-3 pt-1">
              <span className="text-3xl font-black text-slate-900">${price.toFixed(2)}</span>
              {hasDiscount && (
                <span className="text-base text-slate-400 line-through">
                  ${comparePrice!.toFixed(2)}
                </span>
              )}
            </div>

            {/* Short Description */}
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {product.shortDescription}
            </p>

            <hr className="border-slate-200" />

            {/* Variant Selector */}
            {product.variants.length > 0 && (
              <div className="space-y-2">
                <span className="block text-xs font-bold text-slate-900">
                  Select Model / Finish:{' '}
                  <span className="font-normal text-slate-600">{currentVariant?.name}</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        currentVariant?.id === v.id
                          ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selector & Purchase CTAs */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                {/* Quantity */}
                <div className="flex items-center border border-slate-200 rounded-xl h-12 px-3 bg-slate-50">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-1 text-slate-500 hover:text-slate-900 font-bold"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center text-sm font-bold text-slate-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(stock, quantity + 1))}
                    className="p-1 text-slate-500 hover:text-slate-900 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Add to Cart */}
                <Button
                  onClick={handleAddToCart}
                  disabled={stock <= 0}
                  className="flex-1 h-12 text-sm font-bold gap-2 shadow-sm"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                </Button>

                {/* Wishlist Button */}
                <button
                  onClick={handleToggleWishlist}
                  className={`p-3.5 rounded-xl border transition-colors ${
                    inWishlist
                      ? 'border-rose-200 bg-rose-50 text-rose-600'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                  title="Save to Wishlist"
                >
                  <Heart className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`} />
                </button>

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                  title="Share product link"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>

              {/* Instant Buy Now Button */}
              {stock > 0 && (
                <Button
                  onClick={handleBuyNow}
                  variant="secondary"
                  className="w-full h-12 text-sm font-bold bg-amber-400 hover:bg-amber-500 text-slate-950 flex items-center justify-center gap-2 shadow-sm"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  Instant Buy Now (Fast Checkout)
                </Button>
              )}
            </div>

            {/* Vendor Confidence Mini-Card */}
            {vendor && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 mt-4">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={vendor.logoUrl}
                      alt={vendor.storeName}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="font-bold text-slate-900">{vendor.storeName}</span>
                  </div>
                  <span className="text-slate-500">Response: {vendor.responseTime}</span>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-2">{vendor.description}</p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                  <span className="text-slate-500">{vendor.location}</span>
                  <Link
                    to={`/vendors/${vendor.slug}`}
                    className="font-bold text-blue-600 hover:underline"
                  >
                    View Store Catalog →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Frequently Bought Together Bundle */}
      {frequentlyBought.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 mb-16 shadow-sm">
          <div className="mb-6">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Smart Pairing
            </span>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">Frequently Bought Together</h3>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-4">
              {/* Main item */}
              <div className="flex items-center gap-3">
                <img
                  src={product.images[0]?.url}
                  alt=""
                  className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 line-clamp-1 max-w-[180px]">
                    {product.title}
                  </p>
                  <p className="text-xs font-extrabold text-slate-900">${price.toFixed(2)}</p>
                </div>
              </div>

              {/* Plus items */}
              {frequentlyBought.map((item) => (
                <React.Fragment key={item.id}>
                  <span className="text-slate-400 font-bold">+</span>
                  <label className="flex items-center gap-3 cursor-pointer bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <input
                      type="checkbox"
                      checked={Boolean(bundleChecked[item.id])}
                      onChange={(e) =>
                        setBundleChecked({ ...bundleChecked, [item.id]: e.target.checked })
                      }
                      className="rounded text-slate-900 focus:ring-slate-900"
                    />
                    <img
                      src={item.images[0]?.url}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900 line-clamp-1 max-w-[160px]">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-600 font-semibold">
                        ${item.price.toFixed(2)}
                      </p>
                    </div>
                  </label>
                </React.Fragment>
              ))}
            </div>

            {/* Total and Action */}
            <div className="flex items-center gap-4 lg:border-l lg:border-slate-200 lg:pl-8">
              <div>
                <p className="text-xs text-slate-500 font-medium">Bundle Price:</p>
                <p className="text-2xl font-black text-slate-900">${bundleTotal.toFixed(2)}</p>
              </div>
              <Button onClick={handleAddBundleToCart} className="font-bold">
                Add Bundle to Cart
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Deep Specification & Review Tabs */}
      <section className="bg-white border border-slate-200 rounded-3xl overflow-hidden mb-16 shadow-sm">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar bg-slate-50/50">
          <button
            onClick={() => setActiveTab('specs')}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
              activeTab === 'specs'
                ? 'border-b-2 border-slate-900 text-slate-900 bg-white'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Technical Specifications
          </button>
          <button
            onClick={() => setActiveTab('desc')}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
              activeTab === 'desc'
                ? 'border-b-2 border-slate-900 text-slate-900 bg-white'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Description & Highlights
          </button>
          <button
            onClick={() => setActiveTab('shipping')}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
              activeTab === 'shipping'
                ? 'border-b-2 border-slate-900 text-slate-900 bg-white'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Shipping & Return Policies
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'reviews'
                ? 'border-b-2 border-slate-900 text-slate-900 bg-white'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Verified Reviews</span>
            <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full text-[10px]">
              {reviews.length}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 sm:p-10">
          {/* TAB 1: SPECS */}
          {activeTab === 'specs' && (
            <div className="max-w-3xl">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Technical Specifications</h3>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                {Object.entries(product.specifications).map(([key, val]) => (
                  <div key={key} className="grid grid-cols-3 p-4 text-xs">
                    <span className="font-bold text-slate-700">{key}</span>
                    <span className="col-span-2 text-slate-600 font-medium">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: DESCRIPTION */}
          {activeTab === 'desc' && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Artisan Heritage & Narrative
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3">Key Features</h4>
                <ul className="space-y-2">
                  {product.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: SHIPPING */}
          {activeTab === 'shipping' && (
            <div className="max-w-3xl space-y-6">
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" /> Dispatch & Delivery Guarantee
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {vendor?.policies.shipping ||
                    'Complimentary express dispatch with tracked DHL Air Courier.'}
                </p>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-blue-600" /> Return & Exchange Policy
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {vendor?.policies.returns ||
                    '30-day money-back satisfaction guarantee on all orders.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: REVIEWS */}
          {activeTab === 'reviews' && (
            <div className="space-y-8">
              {/* Rating Summary & Breakdown Bars */}
              {breakdown && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="md:col-span-4 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-slate-200 pb-6 md:pb-0 md:pr-6">
                    <span className="text-5xl font-black text-slate-900">{breakdown.average}</span>
                    <RatingStars
                      rating={breakdown.average}
                      showCount={false}
                      size="lg"
                      className="my-2"
                    />
                    <span className="text-xs text-slate-500 font-medium">
                      Based on {breakdown.totalReviews} verified purchases
                    </span>
                    <Button
                      onClick={() => setIsReviewModalOpen(true)}
                      size="sm"
                      className="mt-4 font-bold"
                    >
                      Write a Review
                    </Button>
                  </div>

                  <div className="md:col-span-8 flex flex-col justify-center space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => (
                      <div key={star} className="flex items-center gap-3 text-xs">
                        <span className="w-8 font-semibold text-slate-700">{star} ★</span>
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${breakdown.percentages[star] || 0}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-slate-500">
                          {breakdown.counts[star] || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews List */}
              <div className="divide-y divide-slate-100">
                {reviews.map((rev) => (
                  <div key={rev.id} className="py-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden">
                          {rev.userAvatar ? (
                            <img
                              src={rev.userAvatar}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-600">
                              {rev.userName[0]}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{rev.userName}</span>
                            {rev.isVerifiedPurchase && (
                              <Badge variant="success" size="sm">
                                Verified Buyer
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {new Date(rev.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <RatingStars rating={rev.rating} showCount={false} size="sm" />
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{rev.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>

                    <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                      <button
                        onClick={() => {
                          reviewsService.markHelpful(rev.id);
                          addToast('Thank you for your feedback', 'info');
                        }}
                        className="flex items-center gap-1 hover:text-slate-700"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>Helpful ({rev.helpfulCount})</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Related Products Carousel */}
      {relatedProducts.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black text-slate-900">Related Collections</h3>
            <Link to="/shop" className="text-xs font-bold text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Write Review Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="Write a Verified Customer Review"
        maxWidth="md"
      >
        <form onSubmit={handleSubmitReview} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">Your Rating</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className="p-1 text-amber-400 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-6 h-6 ${star <= reviewRating ? 'fill-current' : 'text-slate-300'}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">Headline</label>
            <input
              type="text"
              required
              placeholder="Summarize your experience"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">Written Review</label>
            <textarea
              required
              rows={4}
              placeholder="What did you love about the materials, acoustic qualities, or craft?"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-slate-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsReviewModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmittingReview}>
              Publish Review
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
