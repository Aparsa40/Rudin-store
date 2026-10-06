import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Store, ArrowRight } from 'lucide-react';
import { vendorService } from '../services/products.service';
import { Vendor } from '../types';
import { Button } from '../components/ui/Button';

export const VendorsList: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVendors = async () => {
      setIsLoading(true);
      try {
        const data = await vendorService.getVendors();
        setVendors(data);
      } catch (error) {
        console.error('Error fetching vendors', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVendors();
  }, []);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Our Independent Creators</h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Discover unique products from verified artisans, boutiques, and brands around the world.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white border border-slate-200 rounded-2xl p-6">
              <div className="w-16 h-16 bg-slate-200 rounded-full mb-4"></div>
              <div className="h-6 bg-slate-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-full mb-6"></div>
              <div className="h-10 bg-slate-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {vendors.map(vendor => (
            <div key={vendor.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-shadow flex flex-col">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200 flex items-center justify-center">
                  {vendor.logoUrl ? (
                    <img src={vendor.logoUrl} alt={vendor.storeName} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    {vendor.storeName}
                    {vendor.isVerified && (
                      <span className="w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold" title="Verified">✓</span>
                    )}
                  </h3>
                  <div className="flex items-center gap-1 text-sm mt-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-slate-900">{vendor.rating.toFixed(1)}</span>
                    <span className="text-slate-500">({vendor.reviewCount} reviews)</span>
                  </div>
                </div>
              </div>
              
              <p className="text-slate-600 mb-6 flex-grow line-clamp-3">
                {vendor.description}
              </p>
              
              <Link to={`/vendors/${vendor.slug}`} className="mt-auto">
                <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                  Visit Store <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
