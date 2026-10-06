import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Heart, Shield, Truck, Share2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { productsService, vendorService } from '../services/products.service';
import { Product, Vendor, ProductVariant } from '../types';
import { useCartStore } from '../store/cartStore';
import { Button } from '../components/ui/Button';

export const ProductDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        if (slug) {
          const p = await productsService.getProductBySlug(slug);
          if (p) {
            setProduct(p);
            const primaryImg = p.images.find(img => img.isPrimary) || p.images[0];
            setSelectedImage(primaryImg.url);
            setSelectedVariant(p.variants.length > 0 ? p.variants[0] : null);
            
            const v = await vendorService.getVendorById(p.vendorId);
            setVendor(v);
          }
        }
      } catch (error) {
        console.error('Error fetching product', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  const handleAddToCart = () => {
    if (product) {
      addItem({
        productId: product.id,
        variantId: selectedVariant?.id,
        quantity
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse flex flex-col md:flex-row gap-8">
          <div className="md:w-1/2 aspect-square bg-slate-200 rounded-2xl"></div>
          <div className="md:w-1/2 space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            <div className="h-10 bg-slate-200 rounded w-3/4"></div>
            <div className="h-6 bg-slate-200 rounded w-1/3"></div>
            <div className="h-24 bg-slate-200 rounded w-full"></div>
            <div className="h-12 bg-slate-200 rounded w-full mt-8"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return <div className="container mx-auto px-4 py-20 text-center font-bold text-xl">Product not found</div>;
  }

  const price = selectedVariant?.price || product.price;
  const stock = selectedVariant ? selectedVariant.stockQuantity : 0;
  const isOutOfStock = stock === 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link to="/" className="hover:text-slate-900">Home</Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-slate-900">Shop</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium truncate">{product.title}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 mb-16">
        {/* Gallery */}
        <div className="lg:w-1/2 flex flex-col-reverse md:flex-row gap-4">
          <div className="flex md:flex-col gap-4 overflow-x-auto md:overflow-y-auto md:w-24 flex-shrink-0 no-scrollbar">
            {product.images.map((img) => (
              <button 
                key={img.id}
                className={`w-20 h-20 md:w-24 md:h-24 flex-shrink-0 rounded-xl overflow-hidden border-2 ${selectedImage === img.url ? 'border-slate-900' : 'border-transparent'}`}
                onClick={() => setSelectedImage(img.url)}
              >
                <img src={img.url} alt={img.altText || product.title} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <div className="flex-grow bg-slate-50 rounded-2xl overflow-hidden relative aspect-square">
            <img src={selectedImage} alt={product.title} className="absolute inset-0 w-full h-full object-cover" />
          </div>
        </div>

        {/* Product Info */}
        <div className="lg:w-1/2">
          {vendor && (
            <Link to={`/vendors/${vendor.slug}`} className="text-sm font-medium text-slate-500 hover:text-slate-900 mb-2 block">
              {vendor.storeName}
            </Link>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight">{product.title}</h1>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              <span className="font-bold text-slate-900">{product.rating.toFixed(1)}</span>
              <span className="text-slate-500 underline cursor-pointer">({product.reviewCount} reviews)</span>
            </div>
            {stock > 0 ? (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">In Stock</span>
            ) : (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">Out of Stock</span>
            )}
          </div>

          <div className="flex items-end gap-3 mb-6">
            <span className="text-3xl font-bold text-slate-900">${price.toFixed(2)}</span>
            {product.compareAtPrice && product.compareAtPrice > price && (
              <span className="text-lg text-slate-500 line-through mb-1">${product.compareAtPrice.toFixed(2)}</span>
            )}
          </div>

          <p className="text-slate-600 mb-8">{product.description}</p>

          <hr className="border-slate-200 mb-8" />

          {/* Variants */}
          {product.variants.length > 0 && (
            <div className="mb-8">
              <h3 className="font-bold text-slate-900 mb-3">Options</h3>
              <div className="flex flex-wrap gap-3">
                {product.variants.map(variant => (
                  <button
                    key={variant.id}
                    className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                      selectedVariant?.id === variant.id 
                        ? 'border-slate-900 bg-slate-900 text-white' 
                        : 'border-slate-300 text-slate-700 hover:border-slate-400'
                    }`}
                    onClick={() => setSelectedVariant(variant)}
                  >
                    {variant.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity & Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex items-center border border-slate-300 rounded-lg h-12 w-32">
              <button 
                className="w-10 flex items-center justify-center text-slate-500 hover:text-slate-900 disabled:opacity-50"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </button>
              <input 
                type="number" 
                value={quantity} 
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full text-center font-medium outline-none"
              />
              <button 
                className="w-10 flex items-center justify-center text-slate-500 hover:text-slate-900 disabled:opacity-50"
                onClick={() => setQuantity(quantity + 1)}
                disabled={quantity >= stock}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <Button 
              size="lg" 
              className="flex-1 text-lg gap-2" 
              disabled={isOutOfStock}
              onClick={handleAddToCart}
            >
              <ShoppingBag className="w-5 h-5" />
              {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </Button>
            
            <Button size="icon" variant="outline" className="h-12 w-12 flex-shrink-0">
              <Heart className="w-5 h-5 text-slate-600" />
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <Truck className="w-6 h-6 text-slate-600" />
              <div>
                <div className="font-medium text-slate-900 text-sm">Free Delivery</div>
                <div className="text-xs text-slate-500">Ships within 24 hours</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <Shield className="w-6 h-6 text-slate-600" />
              <div>
                <div className="font-medium text-slate-900 text-sm">Return Policy</div>
                <div className="text-xs text-slate-500">30 days return</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
