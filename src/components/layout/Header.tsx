import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, User, Heart, Menu, X } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';

export const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const cartItemsCount = useCartStore((state) => state.getItemCount());
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-sm">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white text-xs font-medium py-2 px-4 text-center">
        Free shipping on all orders over $50. <Link to="/shop" className="underline hover:text-slate-200">Shop now</Link>
      </div>
      
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Mobile Menu Button */}
        <button 
          className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Logo */}
        <Link to="/" className="flex-shrink-0 flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-900 text-white flex items-center justify-center rounded-lg font-bold text-xl">
            R
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 hidden sm:block">
            Rudin Store
          </span>
        </Link>

        {/* Desktop Search */}
        <div className="hidden lg:flex flex-grow max-w-2xl mx-8">
          <form onSubmit={handleSearch} className="w-full relative">
            <input
              type="text"
              placeholder="Search products, brands, or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-12 py-2.5 bg-slate-100 border-transparent rounded-full text-sm focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-900 outline-none transition-all"
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-900">
              <Search className="w-5 h-5" />
            </button>
          </form>
        </div>

        {/* Desktop Navigation & Actions */}
        <div className="flex items-center gap-1 sm:gap-4">
          <nav className="hidden lg:flex items-center gap-6 mr-4">
            <Link to="/shop" className="text-sm font-medium text-slate-600 hover:text-slate-900">Shop</Link>
            <Link to="/categories/electronics" className="text-sm font-medium text-slate-600 hover:text-slate-900">Electronics</Link>
            <Link to="/categories/clothing" className="text-sm font-medium text-slate-600 hover:text-slate-900">Clothing</Link>
            <Link to="/vendors" className="text-sm font-medium text-slate-600 hover:text-slate-900">Stores</Link>
          </nav>

          <Link to="/account/wishlist" className="p-2 text-slate-600 hover:text-slate-900 hidden sm:block">
            <Heart className="w-6 h-6" />
          </Link>
          
          <Link to={isAuthenticated ? "/account" : "/login"} className="p-2 text-slate-600 hover:text-slate-900">
            <User className="w-6 h-6" />
          </Link>

          <Link to="/cart" className="p-2 text-slate-600 hover:text-slate-900 relative">
            <ShoppingBag className="w-6 h-6" />
            {cartItemsCount > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-blue-600 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                {cartItemsCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed top-0 left-0 bottom-0 w-[280px] bg-white shadow-xl flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-lg font-bold">Menu</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-slate-100">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-2 bg-slate-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-900"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">
                  <Search className="w-4 h-4" />
                </button>
              </form>
            </div>

            <nav className="flex-grow overflow-y-auto py-4">
              <Link to="/" className="block px-6 py-3 font-medium text-slate-900" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
              <Link to="/shop" className="block px-6 py-3 font-medium text-slate-900" onClick={() => setIsMobileMenuOpen(false)}>Shop All</Link>
              <Link to="/categories/electronics" className="block px-6 py-3 font-medium text-slate-600" onClick={() => setIsMobileMenuOpen(false)}>Electronics</Link>
              <Link to="/categories/clothing" className="block px-6 py-3 font-medium text-slate-600" onClick={() => setIsMobileMenuOpen(false)}>Clothing</Link>
              <Link to="/categories/home-garden" className="block px-6 py-3 font-medium text-slate-600" onClick={() => setIsMobileMenuOpen(false)}>Home & Garden</Link>
              <Link to="/vendors" className="block px-6 py-3 font-medium text-slate-900 border-t border-slate-50 mt-2" onClick={() => setIsMobileMenuOpen(false)}>All Stores</Link>
            </nav>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              {isAuthenticated ? (
                <Link to="/account" className="flex items-center gap-3 p-2 font-medium" onClick={() => setIsMobileMenuOpen(false)}>
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-900">My Account</div>
                    <div className="text-xs text-slate-500">{user?.email}</div>
                  </div>
                </Link>
              ) : (
                <div className="flex gap-2">
                  <Link to="/login" className="flex-1 text-center py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium" onClick={() => setIsMobileMenuOpen(false)}>Log In</Link>
                  <Link to="/register" className="flex-1 text-center py-2 bg-slate-900 text-white rounded-lg text-sm font-medium" onClick={() => setIsMobileMenuOpen(false)}>Sign Up</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
