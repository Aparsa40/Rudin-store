import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Eye, ShoppingBag } from 'lucide-react';
import { Product } from '../../types';
import { Badge } from '../ui/Badge';
import { RatingStars } from '../ui/RatingStars';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useUIStore } from '../../store/uiStore';
import { useTranslation } from '../../i18n';

interface ProductCardProps {
  product: Product;
  viewMode?: 'grid' | 'list';
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, viewMode = 'grid' }) => {
  const { t, formatPrice, formatNumber } = useTranslation();
  const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0];
  const secondaryImage = product.images[1] || primaryImage;

  const addItem = useCartStore((state) => state.addItem);
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const { openQuickView, addToast } = useUIStore();

  const isFavorited = isInWishlist(product.id);
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - product.price / product.compareAtPrice!) * 100)
    : 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      variantId: product.variants[0]?.id,
      quantity: 1,
    });
    addToast(t('product.addedToCart', { title: product.title }), 'success');
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const added = toggleWishlist(product.id);
    addToast(
      added
        ? t('product.addedToWishlist', { title: product.title })
        : t('product.removedFromWishlist'),
      'info',
    );
  };

  const handleOpenQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openQuickView(product);
  };

  // LIST VIEW LAYOUT
  if (viewMode === 'list') {
    return (
      <div className="group relative bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-5 hover:border-slate-300 hover:shadow-lg transition-all duration-300">
        <div className="relative w-full sm:w-52 aspect-square rounded-xl overflow-hidden bg-slate-100 shrink-0">
          <Link to={`/product/${product.slug}`} aria-label={product.title}>
            <img
              src={primaryImage.url}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </Link>
          {hasDiscount && (
            <div className="absolute top-2 inset-s-2">
              <Badge variant="danger" size="sm">
                -{formatNumber(discountPercent)}%
              </Badge>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-between py-1">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>{product.brandName || t('product.independentMaker')}</span>
              <span className="text-emerald-700 font-medium">{t('product.inStock')}</span>
            </div>

            <Link to={`/product/${product.slug}`}>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">
                {product.title}
              </h3>
            </Link>

            <RatingStars
              rating={product.rating}
              reviewCount={product.reviewCount}
              size="sm"
              className="mb-3"
            />

            <p className="text-xs text-slate-600 line-clamp-2 mb-3">{product.shortDescription}</p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-slate-900">{formatPrice(product.price)}</span>
              {hasDiscount && (
                <span className="text-xs text-slate-400 line-through">
                  {formatPrice(product.compareAtPrice!)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenQuickView}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t('product.quickView')}
              </button>
              <button
                onClick={handleQuickAdd}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5 shadow-sm"
              >
                <ShoppingBag className="w-3.5 h-3.5" /> {t('product.addToCart')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // GRID VIEW LAYOUT (DEFAULT)
  return (
    <div className="group relative flex flex-col bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Image Container with Badges & Hover Controls */}
      <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
        <Link to={`/product/${product.slug}`} className="block w-full h-full" aria-label={product.title}>
          <img
            src={primaryImage.url}
            alt={product.title}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 group-hover:opacity-0"
          />
          <img
            src={secondaryImage.url}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover transition-all duration-500 opacity-0 group-hover:opacity-100 group-hover:scale-105"
          />
        </Link>

        {/* Top Badges */}
        <div className="absolute top-2.5 inset-s-2.5 z-10 flex flex-col gap-1 pointer-events-none">
          {hasDiscount && (
            <Badge variant="danger" size="sm">
              -{formatNumber(discountPercent)}%
            </Badge>
          )}
          {product.isFlashDeal && (
            <Badge variant="warning" size="sm">
              {t('product.flashDeal')}
            </Badge>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleToggleWishlist}
          className={`absolute top-2.5 inset-e-2.5 z-10 p-2 rounded-full backdrop-blur transition-all duration-200 shadow-sm ${
            isFavorited
              ? 'bg-rose-50 text-rose-600 opacity-100'
              : 'bg-white/80 text-slate-600 hover:bg-white hover:text-rose-600 opacity-0 group-hover:opacity-100'
          }`}
          aria-label={t('product.addToWishlist')}
        >
          <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
        </button>

        {/* Quick View Floating Button on Hover */}
        <div className="absolute inset-x-3 bottom-3 z-10 flex gap-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <button
            onClick={handleOpenQuickView}
            className="flex-1 py-2 px-3 bg-white/95 backdrop-blur hover:bg-white text-slate-900 text-xs font-bold rounded-xl shadow-md border border-slate-200 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-slate-600" /> {t('product.quickView')}
          </button>
          <button
            onClick={handleQuickAdd}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md transition-colors"
            aria-label={t('product.quickAddToCart')}
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mb-1">
            <span>{product.brandName || t('product.independentMaker')}</span>
            {product.stock <= 5 && product.stock > 0 && (
              <span className="text-amber-600 font-semibold">
                {t('product.onlyLeft', { count: formatNumber(product.stock) })}
              </span>
            )}
          </div>

          <Link to={`/product/${product.slug}`}>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 line-clamp-2 transition-colors mb-2 leading-snug">
              {product.title}
            </h3>
          </Link>

          <RatingStars
            rating={product.rating}
            reviewCount={product.reviewCount}
            size="sm"
            className="mb-3"
          />
        </div>

        {/* Price & Action */}
        <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-extrabold text-slate-900">
              {formatPrice(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-slate-400 line-through">
                {formatPrice(product.compareAtPrice!)}
              </span>
            )}
          </div>

          <span className="text-[11px] text-slate-400 font-medium">{t('product.freeShipNote')}</span>
        </div>
      </div>
    </div>
  );
};
