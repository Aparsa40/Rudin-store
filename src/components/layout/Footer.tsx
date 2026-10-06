import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Truck, RotateCcw, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-900 pt-16 pb-12 text-xs">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white text-slate-950 rounded-xl flex items-center justify-center font-black text-lg">
                R
              </div>
              <span className="text-lg font-black tracking-tight text-white">RUDIN STORE</span>
            </Link>

            <p className="text-slate-400 max-w-sm text-xs leading-relaxed">
              The premier international multi-vendor marketplace dedicated to independent audio
              laboratories, textile ateliers, and ceramic master makers.
            </p>

            <div className="pt-2 text-[11px] text-slate-500 space-y-1">
              <p>Escrow-protected multi-vendor transactions.</p>
              <p>Carbon-neutral express worldwide shipping.</p>
            </div>
          </div>

          {/* Departments */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
              Marketplace Catalog
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/shop" className="hover:text-white transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/categories/electronics" className="hover:text-white transition-colors">
                  Audio & Electronics
                </Link>
              </li>
              <li>
                <Link to="/categories/clothing" className="hover:text-white transition-colors">
                  Apparel & Footwear
                </Link>
              </li>
              <li>
                <Link to="/categories/home-living" className="hover:text-white transition-colors">
                  Home & Living
                </Link>
              </li>
              <li>
                <Link
                  to="/categories/kitchen-coffee"
                  className="hover:text-white transition-colors"
                >
                  Specialty Coffee
                </Link>
              </li>
              <li>
                <Link
                  to="/categories/bags-accessories"
                  className="hover:text-white transition-colors"
                >
                  EDC & Leather Goods
                </Link>
              </li>
            </ul>
          </div>

          {/* Independent Stores */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
              Makers & Portals
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/vendors" className="hover:text-white transition-colors">
                  Verified Makers Directory
                </Link>
              </li>
              <li>
                <Link to="/seller/join" className="hover:text-white transition-colors">
                  Apply as an Artisan Maker
                </Link>
              </li>
              <li>
                <Link
                  to="/seller/dashboard"
                  className="text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                >
                  Seller Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/admin"
                  className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                >
                  Platform Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Support */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
              Account & Care
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/account/orders" className="hover:text-white transition-colors">
                  Track Orders & Shipments
                </Link>
              </li>
              <li>
                <Link to="/account/wishlist" className="hover:text-white transition-colors">
                  Saved Wishlist
                </Link>
              </li>
              <li>
                <Link to="/account" className="hover:text-white transition-colors">
                  Profile & Address Book
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-white transition-colors">
                  Shopping Cart
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="border-t border-slate-900 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} Rudin Store Marketplace Inc. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer">Maker Code of Conduct</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
