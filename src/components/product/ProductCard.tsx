import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ShoppingBag, Heart } from 'lucide-react';
import { Product } from '../../types';
import { Button } from '../ui/Button';
import { useCartStore } from '../../store/cartStore';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
  const secondaryImage = product.images.length > 1 ? product.images[1] : primaryImage;
  const addItem = useCartStore(state => state.addItem);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to product page
    e.stopPropagation();
    
    // Add default variant or first variant
    const variantId = product.variants.length > 0 ? product.variants[0].id : undefined;
    
    addItem({
      productId: product.id,
      variantId,
      quantity: 1
    });
  };

  return (
    <Link to={`/product/${product.slug}`} className="group flex flex-col bg-white rounded-xl overflow-hidden border border-slate-200 hover:shadow-lg transition-all duration-300">
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        {/* Discount Badge */}
        {product.compareAtPrice && product.compareAtPrice > product.price && (
          <div className="absolute top-2 left-2 z-10 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
            -{Math.round((1 - product.price / product.compareAtPrice) * 100)}%
          </div>
        )}
        
        {/* Wishlist Button */}
        <button 
          className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white/80 backdrop-blur text-slate-400 hover:text-red-500 hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <Heart className="w-4 h-4" />
        </button>

        {/* Images */}
        <img 
          src={primaryImage.url} 
          alt={primaryImage.altText || product.title} 
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-0"
        />
        <img 
          src={secondaryImage.url} 
          alt={secondaryImage.altText || product.title} 
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        />
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <div className="text-xs text-slate-500 mb-1">{product.brandId || 'Generic'}</div>
        <h3 className="font-medium text-slate-900 mb-2 line-clamp-2 flex-grow">{product.title}</h3>
        
        <div className="flex items-center gap-1 mb-2">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span className="text-sm font-medium text-slate-700">{product.rating.toFixed(1)}</span>
          <span className="text-xs text-slate-500">({product.reviewCount})</span>
        </div>

        <div className="flex items-end justify-between mt-auto pt-2">
          <div className="flex flex-col">
            <span className="font-bold text-lg text-slate-900">${product.price.toFixed(2)}</span>
            {product.compareAtPrice && (
              <span className="text-xs text-slate-500 line-through">${product.compareAtPrice.toFixed(2)}</span>
            )}
          </div>
          
          <Button 
            variant="secondary" 
            size="icon" 
            className="rounded-full bg-slate-100 text-slate-900 hover:bg-slate-900 hover:text-white"
            onClick={handleAddToCart}
          >
            <ShoppingBag className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Link>
  );
};
