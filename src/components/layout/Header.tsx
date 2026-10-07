import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  Heart,
  User as UserIcon,
  Menu,
  X,
  ChevronDown,
  Store,
  ShieldAlert,
  LogOut,
  Sparkles,
  Layers,
  Check,
} from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useAuthStore } from '../../store/authStore';
import { SearchBar } from '../search/SearchBar';
import { Role } from '../../types';

export const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);

  const cartCount = useCartStore((state) => state.getItemCount());
  const openCartDrawer = useCartStore((state) => state.openDrawer);
  const wishlistCount = useWishlistStore((state) => state.getCount());
  const { user, logout, setDemoRole } = useAuthStore();

  const navigate = useNavigate();
  const location = useLocation();

  const handleRoleChange = (role: Role) => {
    setDemoRole(role);
    setIsAccountDropdownOpen(false);
    if (role === 'VENDOR') navigate('/seller/dashboard');
    else if (role === 'ADMIN') navigate('/admin');
    else navigate('/account');
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-200">
      {/* Top Announcement & Switcher Bar */}
      <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span className="bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded text-[10px] tracking-wide uppercase">
              Autumn Market
            </span>
            <span>
              Use code <strong className="text-white font-mono">RUDIN15</strong> for 15% off
              independent creator collections.
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-300">
            {/* Quick Demo Role Switcher */}
            <div className="flex items-center gap-1.5 text-[11px] bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700">
              <span className="text-slate-400">View as:</span>
              <button
                onClick={() => handleRoleChange('CUSTOMER')}
                className={`font-semibold transition-colors ${
                  user?.role === 'CUSTOMER'
                    ? 'text-white underline'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Customer
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => handleRoleChange('VENDOR')}
                className={`font-semibold transition-colors ${
                  user?.role === 'VENDOR'
                    ? 'text-amber-400 underline'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Seller
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => handleRoleChange('ADMIN')}
                className={`font-semibold transition-colors ${
                  user?.role === 'ADMIN'
                    ? 'text-blue-400 underline'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Admin
              </button>
            </div>

            <Link to="/seller/join" className="hover:text-white transition-colors hidden md:block">
              Sell on Rudin
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="container mx-auto px-4 h-18 flex items-center justify-between gap-4">
        {/* Mobile menu button */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xl tracking-tight shadow-md group-hover:scale-105 transition-transform">
            R
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-slate-900 leading-none">
              RUDIN
            </span>
            <span className="text-[10px] tracking-widest text-slate-400 uppercase font-semibold">
              Marketplace
            </span>
          </div>
        </Link>

        {/* Search Bar (Desktop) */}
        <div className="hidden lg:block flex-1 max-w-xl mx-4">
          <SearchBar />
        </div>

        {/* Navigation Links (Desktop) */}
        <nav className="hidden xl:flex items-center gap-6 text-sm font-medium text-slate-700">
          <Link
            to="/shop"
            className={`hover:text-slate-900 transition-colors ${
              location.pathname === '/shop' ? 'text-slate-900 font-bold' : ''
            }`}
          >
            All Products
          </Link>
          <Link to="/categories/electronics" className="hover:text-slate-900 transition-colors">
            Audio & Electronics
          </Link>
          <Link to="/categories/clothing" className="hover:text-slate-900 transition-colors">
            Apparel
          </Link>
          <Link
            to="/vendors"
            className="hover:text-slate-900 transition-colors flex items-center gap-1.5"
          >
            <Store className="w-4 h-4 text-slate-400" />
            Makers & Stores
          </Link>
        </nav>

        {/* User Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Wishlist */}
          <Link
            to="/account/wishlist"
            className="relative p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            title="Wishlist"
          >
            <Heart className="w-5 h-5" />
            {wishlistCount > 0 && (
              <span className="absolute top-1 right-1 bg-rose-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center shadow-sm">
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* Account Menu */}
          <div className="relative">
            <button
              onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                {user ? (
                  `${user.firstName[0]}${user.lastName[0]}`
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold leading-none">{user?.firstName}</span>
                <span className="text-[10px] text-slate-400 capitalize font-medium">
                  {user?.role?.toLowerCase()}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Account Dropdown */}
            {isAccountDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                </div>

                <div className="py-1">
                  <Link
                    to="/account"
                    onClick={() => setIsAccountDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <UserIcon className="w-4 h-4 text-slate-400" /> Account Profile
                  </Link>
                  <Link
                    to="/account/orders"
                    onClick={() => setIsAccountDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Layers className="w-4 h-4 text-slate-400" /> Order History
                  </Link>
                  <Link
                    to="/account/wishlist"
                    onClick={() => setIsAccountDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Heart className="w-4 h-4 text-slate-400" /> Wishlist ({wishlistCount})
                  </Link>

                  {/* Portals */}
                  <div className="border-t border-slate-100 my-1 pt-1">
                    <Link
                      to="/seller/dashboard"
                      onClick={() => {
                        setDemoRole('VENDOR');
                        setIsAccountDropdownOpen(false);
                      }}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                    >
                      <Store className="w-4 h-4" /> Seller Dashboard
                    </Link>
                    <Link
                      to="/admin"
                      onClick={() => {
                        setDemoRole('ADMIN');
                        setIsAccountDropdownOpen(false);
                      }}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      <ShieldAlert className="w-4 h-4" /> Admin Portal
                    </Link>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => {
                      logout();
                      setIsAccountDropdownOpen(false);
                      navigate('/login');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 text-left"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cart Icon (Triggers Drawer) */}
          <button
            onClick={openCartDrawer}
            className="flex items-center gap-2 p-2 sm:px-3.5 sm:py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-bold">Cart</span>
            {cartCount > 0 && (
              <span className="bg-blue-600 text-white text-[11px] font-bold px-1.5 py-0.2 rounded-full">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Search Bar Row */}
      <div className="lg:hidden px-4 pb-3">
        <SearchBar />
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-150 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed top-0 bottom-0 left-0 w-80 bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                  R
                </div>
                <span className="font-bold text-slate-900 text-base">Rudin Store</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Marketplace Catalog
                </p>
                <nav className="space-y-1">
                  <Link
                    to="/shop"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-semibold text-slate-900 rounded-lg hover:bg-slate-100"
                  >
                    All Products
                  </Link>
                  <Link
                    to="/categories/electronics"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-100"
                  >
                    Electronics & Audio
                  </Link>
                  <Link
                    to="/categories/clothing"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-100"
                  >
                    Apparel & Footwear
                  </Link>
                  <Link
                    to="/categories/home-living"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-100"
                  >
                    Home & Living
                  </Link>
                  <Link
                    to="/vendors"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-900 rounded-lg hover:bg-slate-100"
                  >
                    <Store className="w-4 h-4 text-slate-400" /> All Independent Stores
                  </Link>
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Portals & Dashboards
                </p>
                <nav className="space-y-1">
                  <Link
                    to="/seller/dashboard"
                    onClick={() => {
                      setDemoRole('VENDOR');
                      setIsMobileMenuOpen(false);
                    }}
                    className="block px-3 py-2 text-sm font-semibold text-amber-700 rounded-lg hover:bg-amber-50"
                  >
                    Seller Dashboard
                  </Link>
                  <Link
                    to="/admin"
                    onClick={() => {
                      setDemoRole('ADMIN');
                      setIsMobileMenuOpen(false);
                    }}
                    className="block px-3 py-2 text-sm font-semibold text-blue-700 rounded-lg hover:bg-blue-50"
                  >
                    Admin Portal
                  </Link>
                </nav>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                  {user ? `${user.firstName[0]}${user.lastName[0]}` : 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
