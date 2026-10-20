import React, { useEffect, useRef, useState } from 'react';
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
  Crown,
  LogOut,
} from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useAuthStore } from '../../store/authStore';
import { categoriesService } from '../../services/categories/categoriesService';
import { SearchBar } from '../search/SearchBar';
import { LanguageSelector } from './LanguageSelector';
import { NotificationsMenu } from './NotificationsMenu';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useTranslation } from '../../i18n';
import { ANNOUNCEMENT } from '../../config/homeContent';
import { Category, Role } from '../../types';

export const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isCategoriesDropdownOpen, setIsCategoriesDropdownOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const cartCount = useCartStore((state) => state.getItemCount());
  const openCartDrawer = useCartStore((state) => state.openDrawer);
  const wishlistCount = useWishlistStore((state) => state.getCount());
  const { user, logout, setDemoRole } = useAuthStore();
  const { t, formatNumber, language } = useTranslation();

  const accountRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);
  useClickOutside(accountRef, () => setIsAccountDropdownOpen(false), isAccountDropdownOpen);
  useClickOutside(categoriesRef, () => setIsCategoriesDropdownOpen(false), isCategoriesDropdownOpen);

  // Demo role switching is a development-only evaluation tool: it is stripped
  // from production builds, and every portal entry leads to the real
  // authentication route for that role.
  const demoAuthEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_AUTH === 'true';

  const navigate = useNavigate();
  const location = useLocation();

  // Categories come from the application's category service; the dropdown
  // lists only categories the store actually supports.
  useEffect(() => {
    let active = true;
    categoriesService
      .getCategories()
      .then((list) => {
        if (active) setCategories(list);
      })
      .catch(() => {
        // A failed category fetch leaves the dropdown empty; the main
        // navigation entries below remain functional.
      });
    return () => {
      active = false;
    };
  }, []);

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
      {ANNOUNCEMENT.enabled && (
        <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4">
          <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-center sm:text-start">
              <span className="bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded text-[10px] tracking-wide uppercase">
                {ANNOUNCEMENT.badge[language]}
              </span>
              <span>{ANNOUNCEMENT.message[language]}</span>
            </div>

            <div className="flex items-center gap-4 text-slate-300">
              {/* Quick Demo Role Switcher — development-only, never rendered in production builds */}
              {demoAuthEnabled && (
                <div className="flex items-center gap-1.5 text-[11px] bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700">
                  <span className="text-slate-400">{t('header.demoViewAs')}</span>
                  <button
                    onClick={() => handleRoleChange('CUSTOMER')}
                    className={`font-semibold transition-colors ${
                      user?.role === 'CUSTOMER'
                        ? 'text-white underline'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t('header.rolesCustomer')}
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
                    {t('header.rolesVendor')}
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
                    {t('header.rolesAdmin')}
                  </button>
                </div>
              )}

              <Link
                to="/seller/join"
                className="hover:text-white transition-colors hidden md:block"
              >
                {t('header.sellOnRudin')}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <div className="container mx-auto px-4 h-18 flex items-center justify-between gap-4">
        {/* Mobile menu button */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          aria-label={t('header.openMenu')}
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Brand Logo */}
        <Link to="/" className="flex items-center shrink-0 group" aria-label="Rudin Store home">
          <img
            src="/branding/header-logo.svg"
            alt="Rudin Store"
            className="h-11 w-auto max-w-170px object-contain transition-transform group-hover:scale-[1.02]"
          />
        </Link>

        {/* Search Bar (Desktop) */}
        <div className="hidden lg:block flex-1 max-w-xl mx-4">
          <SearchBar />
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Language Selector */}
          <LanguageSelector />

          {/* Notifications (honest empty state; no fabricated counts) */}
          <NotificationsMenu />

          {/* Wishlist */}
          <Link
            to="/account/wishlist"
            className="relative p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            title={t('header.wishlist')}
            aria-label={t('header.wishlist')}
          >
            <Heart className="w-5 h-5" />
            {wishlistCount > 0 && (
              <span className="absolute top-1 'end-1' bg-rose-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center shadow-sm">
                {formatNumber(wishlistCount)}
              </span>
            )}
          </Link>

          {/* Account Menu */}
          <div ref={accountRef} className="relative">
            <button
              onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
              aria-haspopup="menu"
              aria-expanded={isAccountDropdownOpen}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                {user ? (
                  `${user.firstName[0]}${user.lastName[0]}`
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
              </div>
              <div className="hidden md:flex flex-col text-start">
                <span className="text-xs font-bold leading-none">{user?.firstName}</span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {user ? t(`header.roles${user.role.charAt(0)}${user.role.slice(1).toLowerCase()}`) : t('header.accountMenu')}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Account Dropdown */}
            {isAccountDropdownOpen && (
              <div className="absolute 'end-0' mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  {user ? (
                    <>
                      <p className="text-xs font-bold text-slate-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    </>
                  ) : (
                    <p className="text-xs font-bold text-slate-900">{t('header.signIn')}</p>
                  )}
                </div>

                <div className="py-1">
                  <Link
                    to="/account"
                    onClick={() => setIsAccountDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <UserIcon className="w-4 h-4 text-slate-400" /> {t('header.accountProfile')}
                  </Link>
                  <Link
                    to="/account/orders"
                    onClick={() => setIsAccountDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Store className="w-4 h-4 text-slate-400" /> {t('header.orderHistory')}
                  </Link>
                  <Link
                    to="/account/wishlist"
                    onClick={() => setIsAccountDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Heart className="w-4 h-4 text-slate-400" />{' '}
                    {t('header.wishlistWithCount', { count: wishlistCount })}
                  </Link>

                  {/* Role-aware portal shortcuts — plain navigation, never a
                      simulated role change. */}
                  {user && (
                    <div className="border-t border-slate-100 my-1 pt-1">
                      {user.role === 'VENDOR' && (
                        <Link
                          to="/seller/dashboard"
                          onClick={() => setIsAccountDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                        >
                          <Store className="w-4 h-4" /> {t('header.sellerDashboard')}
                        </Link>
                      )}
                      {user.role === 'ADMIN' && (
                        <Link
                          to="/admin"
                          onClick={() => setIsAccountDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          <ShieldAlert className="w-4 h-4" /> {t('header.adminPortal')}
                        </Link>
                      )}
                      {user.role === 'MANAGER' && (
                        <Link
                          to="/manager"
                          onClick={() => setIsAccountDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50"
                        >
                          <Crown className="w-4 h-4" /> {t('header.managerConsole')}
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Real authentication portals for each role. Public self
                      registration exists only for customers and sellers;
                      admins are appointed by the manager, and the manager is
                      provisioned through the controlled bootstrap. */}
                  {!user && (
                    <div className="border-t border-slate-100 my-1 pt-1">
                      <p className="px-4 pt-1 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {t('header.signIn')}
                      </p>
                      <Link
                        to="/login"
                        onClick={() => setIsAccountDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      >
                        <UserIcon className="w-4 h-4 text-slate-400" />{' '}
                        {t('header.customerSignIn')}
                      </Link>
                      <Link
                        to="/vendor/login"
                        onClick={() => setIsAccountDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                      >
                        <Store className="w-4 h-4" /> {t('header.sellerSignIn')}
                      </Link>
                      <Link
                        to="/admin/login"
                        onClick={() => setIsAccountDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        <ShieldAlert className="w-4 h-4" /> {t('header.adminSignIn')}
                      </Link>
                      <Link
                        to="/manager/login"
                        onClick={() => setIsAccountDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50"
                      >
                        <Crown className="w-4 h-4" /> {t('header.managerSignIn')}
                      </Link>
                    </div>
                  )}
                </div>

                {user && (
                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={() => {
                        logout();
                        setIsAccountDropdownOpen(false);
                        navigate('/login');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 text-start"
                    >
                      <LogOut className="w-4 h-4" /> {t('header.signOut')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart Icon (Triggers Drawer) */}
          <button
            onClick={openCartDrawer}
            aria-label={t('header.cartButton')}
            className="flex items-center gap-2 p-2 sm:px-3.5 sm:py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-bold">{t('header.cart')}</span>
            {cartCount > 0 && (
              <span className="bg-blue-600 text-white text-[11px] font-bold px-1.5 py-0.2 rounded-full">
                {formatNumber(cartCount)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Row (Desktop) */}
      <nav
        className="hidden lg:block border-t border-slate-100 bg-white"
        aria-label={t('header.marketplaceCatalog')}
      >
        <div className="container mx-auto px-4 flex items-center gap-6 text-sm font-medium text-slate-700 h-11">
          <div ref={categoriesRef} className="relative">
            <button
              type="button"
              onClick={() => setIsCategoriesDropdownOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={isCategoriesDropdownOpen}
              className="flex items-center gap-1.5 py-2 hover:text-slate-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded"
            >
              {t('header.navCategories')}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  isCategoriesDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isCategoriesDropdownOpen && (
              <div className="absolute 'start-0' mt-0 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
                {categories.length === 0 ? (
                  <Link
                    to="/shop"
                    onClick={() => setIsCategoriesDropdownOpen(false)}
                    className="block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    {t('header.navAllProducts')}
                  </Link>
                ) : (
                  categories.map((category) => (
                    <Link
                      key={category.id}
                      to={`/categories/${category.slug}`}
                      onClick={() => setIsCategoriesDropdownOpen(false)}
                      className="block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    >
                      {category.name}
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>

          <Link
            to="/shop"
            className={`hover:text-slate-900 transition-colors ${
              location.pathname === '/shop' ? 'text-slate-900 font-bold' : ''
            }`}
          >
            {t('header.navAllProducts')}
          </Link>
          <Link to="/#flash-deals" className="hover:text-slate-900 transition-colors">
            {t('header.navFlashDeals')}
          </Link>
          <Link to="/#top-selling" className="hover:text-slate-900 transition-colors">
            {t('header.navBestSellers')}
          </Link>
          <Link
            to="/vendors"
            className="hover:text-slate-900 transition-colors flex items-center gap-1.5"
          >
            <Store className="w-4 h-4 text-slate-400" />
            {t('header.navVendors')}
          </Link>
        </div>
      </nav>

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
          <div className="fixed top-0 bottom-0 'start-0' w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col z-10">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center">
                <img
                  src="/branding/header-logo.svg"
                  alt="Rudin Store"
                  className="h-9 w-auto max-w-150px object-contain"
                />
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label={t('header.closeMenu')}
                className="p-1.5 text-slate-400 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {t('header.marketplaceCatalog')}
                </p>
                <nav className="space-y-1">
                  <Link
                    to="/shop"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-semibold text-slate-900 rounded-lg hover:bg-slate-100"
                  >
                    {t('header.navAllProducts')}
                  </Link>
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      to={`/categories/${category.slug}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-100"
                    >
                      {category.name}
                    </Link>
                  ))}
                  <Link
                    to="/#flash-deals"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-100"
                  >
                    {t('header.navFlashDeals')}
                  </Link>
                  <Link
                    to="/#top-selling"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-100"
                  >
                    {t('header.navBestSellers')}
                  </Link>
                  <Link
                    to="/vendors"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-900 rounded-lg hover:bg-slate-100"
                  >
                    <Store className="w-4 h-4 text-slate-400" /> {t('header.navVendors')}
                  </Link>
                  <Link
                    to="/seller/join"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-semibold text-slate-900 rounded-lg hover:bg-slate-100"
                  >
                    {t('header.sellOnRudin')}
                  </Link>
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {t('header.portalsDashboards')}
                </p>
                <nav className="space-y-1">
                  {user ? (
                    <>
                      {user.role === 'VENDOR' && (
                        <Link
                          to="/seller/dashboard"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="block px-3 py-2 text-sm font-semibold text-amber-700 rounded-lg hover:bg-amber-50"
                        >
                          {t('header.sellerDashboard')}
                        </Link>
                      )}
                      {user.role === 'ADMIN' && (
                        <Link
                          to="/admin"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="block px-3 py-2 text-sm font-semibold text-blue-700 rounded-lg hover:bg-blue-50"
                        >
                          {t('header.adminPortal')}
                        </Link>
                      )}
                      {user.role === 'MANAGER' && (
                        <Link
                          to="/manager"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="block px-3 py-2 text-sm font-semibold text-purple-700 rounded-lg hover:bg-purple-50"
                        >
                          {t('header.managerConsole')}
                        </Link>
                      )}
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-100"
                      >
                        {t('header.customerSignIn')}
                      </Link>
                      <Link
                        to="/vendor/login"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-3 py-2 text-sm text-amber-700 rounded-lg hover:bg-amber-50"
                      >
                        {t('header.sellerSignIn')}
                      </Link>
                      <Link
                        to="/admin/login"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-3 py-2 text-sm text-blue-700 rounded-lg hover:bg-blue-50"
                      >
                        {t('header.adminSignIn')}
                      </Link>
                      <Link
                        to="/manager/login"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-3 py-2 text-sm text-purple-700 rounded-lg hover:bg-purple-50"
                      >
                        {t('header.managerSignIn')}
                      </Link>
                    </>
                  )}
                </nav>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                  {user ? `${user.firstName[0]}${user.lastName[0]}` : <UserIcon className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {user ? `${user.firstName} ${user.lastName}` : t('header.accountMenu')}
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
