import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand Col */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-slate-900 text-white flex items-center justify-center rounded-lg font-bold text-xl">
                R
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Rudin Store
              </span>
            </Link>
            <p className="text-slate-500 mb-6 max-w-sm">
              The premium multi-vendor marketplace for high-quality products. Shop from verified independent sellers worldwide.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links Cols */}
          <div>
            <h3 className="font-bold text-slate-900 mb-4">Shop</h3>
            <ul className="space-y-3">
              <li><Link to="/shop" className="text-slate-500 hover:text-slate-900">All Products</Link></li>
              <li><Link to="/categories/electronics" className="text-slate-500 hover:text-slate-900">Electronics</Link></li>
              <li><Link to="/categories/clothing" className="text-slate-500 hover:text-slate-900">Clothing</Link></li>
              <li><Link to="/categories/home-garden" className="text-slate-500 hover:text-slate-900">Home & Garden</Link></li>
              <li><Link to="/promotions" className="text-slate-500 hover:text-slate-900">Promotions</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold text-slate-900 mb-4">Support</h3>
            <ul className="space-y-3">
              <li><Link to="/help" className="text-slate-500 hover:text-slate-900">Help Center</Link></li>
              <li><Link to="/track-order" className="text-slate-500 hover:text-slate-900">Track Order</Link></li>
              <li><Link to="/returns" className="text-slate-500 hover:text-slate-900">Returns & Refunds</Link></li>
              <li><Link to="/contact" className="text-slate-500 hover:text-slate-900">Contact Us</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-4">Sell on Rudin</h3>
            <ul className="space-y-3 mb-6">
              <li><Link to="/seller/join" className="text-slate-500 hover:text-slate-900">Join as a Seller</Link></li>
              <li><Link to="/seller/dashboard" className="text-slate-500 hover:text-slate-900">Seller Dashboard</Link></li>
              <li><Link to="/seller/policies" className="text-slate-500 hover:text-slate-900">Seller Policies</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-8 mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm text-center md:text-left">
            &copy; {new Date().getFullYear()} Rudin Store. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm">
            <Link to="/privacy" className="text-slate-500 hover:text-slate-900">Privacy Policy</Link>
            <Link to="/terms" className="text-slate-500 hover:text-slate-900">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
