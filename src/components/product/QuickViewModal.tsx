import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, Heart, ShoppingBag, ArrowRight, ShieldCheck, Truck, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { RatingStars } from '../ui/RatingStars';
import { Badge } from '../ui/Badge';
import { useUIStore } from '../../store/uiStore';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { ProductVariant } from '../../types';

export const QuickViewModal: React.FC = () => {
  const { quickViewProduct, closeQuickView, addToast } = useUIStore();
  const addItem = useCartStore((state) => state.addItem);
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const navigate = useNavigate();

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!quickViewProduct) return;
    setSelectedImageIdx(0);
    setSelectedVariant(null);
    setQuantity(1);
  }, [quickViewProduct?.id]);

  if (!quickViewProduct) return null;

  const product = quickViewProduct;
  const currentVariant =
    selectedVariant || (product.variants.length > 0 ? product.variants[0] : null);
  const price = currentVariant ? currentVariant.price : product.price;
  const comparePrice = currentVariant ? currentVariant.compareAtPrice : product.compareAtPrice;
  const hasDiscount = comparePrice && comparePrice > price;
  const inWishlist = isInWishlist(product.id);

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      variantId: currentVariant?.id,
      quantity,
    });
    addToast(`Added ${quantity}x "${product.title}" to cart`, 'success');
    closeQuickView();
  };

  const handleToggleWishlist = () => {
    const added = toggleWishlist(product.id);
    addToast(added ? `Added "${product.title}" to wishlist` : `Removed from wishlist`, 'info');
  };

  return (
    <Modal isOpen={!!quickViewProduct} onClose={closeQuickView} maxWidth="2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
        {/* Left: Gallery */}
        <div className="space-y-3">
          <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-100">
            {hasDiscount && (
              <div className="absolute top-3 left-3 z-10">
                <Badge variant="danger" size="sm">
                  SAVE {Math.round((1 - price / comparePrice!) * 100)}%
                </Badge>
              </div>
            )}
            <img
              src={product.images[selectedImageIdx]?.url || product.images[0]?.url}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {product.images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImageIdx(idx)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
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
        </div>

        {/* Right: Info */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>{product.brandName || 'Independent Maker'}</span>
              <Badge variant="success" size="sm">
                In Stock ({product.stock})
              </Badge>
            </div>

            <h3 className="text-xl font-bold text-slate-900 leading-snug mb-2">{product.title}</h3>

            <div className="flex items-center gap-2 mb-4">
              <RatingStars rating={product.rating} reviewCount={product.reviewCount} size="sm" />
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-2xl font-extrabold text-slate-900">${price.toFixed(2)}</span>
              {hasDiscount && (
                <span className="text-sm text-slate-400 line-through">
                  ${comparePrice!.toFixed(2)}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 line-clamp-3 mb-5 leading-relaxed">
              {product.shortDescription}
            </p>

            {/* Variants */}
            {product.variants.length > 0 && (
              <div className="mb-5">
                <span className="block text-xs font-semibold text-slate-900 mb-2">
                  Select Option:{' '}
                  <span className="font-normal text-slate-600">{currentVariant?.name}</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        currentVariant?.id === v.id
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-3">
              {/* Quantity */}
              <div className="flex items-center border border-slate-200 rounded-lg h-10 px-2 bg-slate-50">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-2 text-slate-500 hover:text-slate-900 font-bold"
                >
                  -
                </button>
                <span className="w-8 text-center text-xs font-bold text-slate-900">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="px-2 text-slate-500 hover:text-slate-900 font-bold"
                >
                  +
                </button>
              </div>

              <Button onClick={handleAddToCart} className="flex-1 h-10 text-xs font-bold gap-2">
                <ShoppingBag className="w-4 h-4" /> Add to Cart
              </Button>

              <button
                onClick={handleToggleWishlist}
                className={`p-2.5 rounded-lg border transition-colors ${
                  inWishlist
                    ? 'border-rose-200 bg-rose-50 text-rose-600'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                }`}
              >
                <Heart className={`w-4 h-4 ${inWishlist ? 'fill-current' : ''}`} />
              </button>
            </div>

            <button
              onClick={() => {
                closeQuickView();
                navigate(`/product/${product.slug}`);
              }}
              className="w-full text-center text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1 py-1"
            >
              View Full Product Details & Specs <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
