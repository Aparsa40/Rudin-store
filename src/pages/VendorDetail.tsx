import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Store, MapPin, Calendar, Heart } from 'lucide-react';
import { vendorService, productsService } from '../services/products.service';
import { Vendor, Product } from '../types';
import { ProductCard } from '../components/product/ProductCard';
import { Button } from '../components/ui/Button';

export const VendorDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const fetchVendorData = async () => {
      setIsLoading(true);
      try {
        if (slug) {
          const v = await vendorService.getVendorBySlug(slug);
          if (v) {
            setVendor(v);
            const p = await productsService.getProductsByVendor(v.id);
            setProducts(p);
          }
        }
      } catch (error) {
        console.error('Error fetching vendor details', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVendorData();
  }, [slug]);

  if (isLoading) {
    return <div className="container mx-auto px-4 py-20 text-center">Loading store...</div>;
  }

  if (!vendor) {
    return <div className="container mx-auto px-4 py-20 text-center font-bold text-xl">Store not found</div>;
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Vendor Banner */}
      <div className="h-48 md:h-64 bg-slate-900 w-full relative">
        {vendor.bannerUrl ? (
          <img src={vendor.bannerUrl} alt="Store banner" className="w-full h-full object-cover opacity-80" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-slate-900 to-slate-700"></div>
        )}
      </div>

      <div className="container mx-auto px-4">
        {/* Vendor Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 -mt-16 relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left mb-12">
          <div className="w-32 h-32 rounded-full border-4 border-white bg-slate-100 overflow-hidden flex-shrink-0 -mt-16 shadow-md flex items-center justify-center">
            {vendor.logoUrl ? (
              <img src={vendor.logoUrl} alt={vendor.storeName} className="w-full h-full object-cover" />
            ) : (
              <Store className="w-12 h-12 text-slate-400" />
            )}
          </div>
          
          <div className="flex-grow">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center justify-center md:justify-start gap-2 mb-2">
                  {vendor.storeName}
                  {vendor.isVerified && (
                    <span className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[12px] font-bold" title="Verified">✓</span>
                  )}
                </h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-slate-900">{vendor.rating.toFixed(1)}</span>
                    <span>({vendor.reviewCount})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {new Date(vendor.createdAt).getFullYear()}</span>
                  </div>
                  <div className="font-medium">
                    {vendor.followerCount + (isFollowing ? 1 : 0)} followers
                  </div>
                </div>
              </div>
              
              <Button 
                variant={isFollowing ? 'secondary' : 'primary'}
                className="gap-2 w-full md:w-auto"
                onClick={() => setIsFollowing(!isFollowing)}
              >
                <Heart className={`w-4 h-4 ${isFollowing ? 'fill-current text-red-500' : ''}`} /> 
                {isFollowing ? 'Following' : 'Follow Store'}
              </Button>
            </div>
            
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto md:mx-0">
              {vendor.description}
            </p>
          </div>
        </div>

        {/* Vendor Products */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">All Products</h2>
            <div className="text-sm text-slate-500">{products.length} items</div>
          </div>
          
          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <Store className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">This store hasn't added any products yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
