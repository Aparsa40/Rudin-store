import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Store, MapPin, CheckCircle2, ArrowRight, Search } from 'lucide-react';
import { vendorsService } from '../services/vendors/vendorsService';
import { Vendor } from '../types';
import { Button } from '../components/ui/Button';

export const VendorsList: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    vendorsService.getVendors().then((data) => {
      setVendors(data);
      setIsLoading(false);
    });
  }, []);

  const filteredVendors = vendors.filter((v) =>
    searchQuery
      ? v.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true,
  );

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      {/* Header */}
      <div className="max-w-2xl mx-auto text-center space-y-4 mb-12">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
          Marketplace Directory
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Verified Independent Makers
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Shop directly from acoustic laboratories, heritage denim weavers, and studio potters.
        </p>

        {/* Search */}
        <div className="relative max-w-md mx-auto pt-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search stores by name, city, or craft specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-xs shadow-sm outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {/* Grid of Stores */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-64 bg-white border border-slate-200 rounded-3xl animate-pulse"
            />
          ))}
        </div>
      ) : filteredVendors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredVendors.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-white border border-slate-200 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
            >
              {/* Banner */}
              <div className="relative h-36 bg-slate-900 overflow-hidden">
                <img
                  src={vendor.bannerUrl}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-slate-900/30" />
              </div>

              {/* Body */}
              <div className="p-6 pt-0 flex-1 flex flex-col justify-between relative">
                <div>
                  <div className="-mt-8 mb-4 flex items-end justify-between">
                    <img
                      src={vendor.logoUrl}
                      alt={vendor.storeName}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md bg-white"
                    />
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-900 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{vendor.rating.toFixed(2)}</span>
                      <span className="text-slate-400 font-normal">({vendor.reviewCount})</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    {vendor.storeName}
                    {vendor.isVerified && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 fill-blue-50" />
                    )}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mb-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" /> {vendor.location}
                    </span>
                    <span>•</span>
                    <span>{vendor.followerCount.toLocaleString()} followers</span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-6">
                    {vendor.description}
                  </p>
                </div>

                <Link to={`/vendors/${vendor.slug}`} className="mt-auto">
                  <Button
                    variant="outline"
                    className="w-full text-xs font-bold border-slate-200 flex items-center justify-center gap-1.5"
                  >
                    <span>Visit Storefront</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 bg-white border border-slate-200 rounded-3xl text-center max-w-md mx-auto">
          <Store className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-900 mb-1">No Stores Found</h3>
          <p className="text-xs text-slate-500">No independent makers matched "{searchQuery}".</p>
        </div>
      )}
    </div>
  );
};
