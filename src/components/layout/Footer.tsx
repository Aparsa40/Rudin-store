import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n';

/**
 * Site footer. Every link targets a route that actually exists in the
 * router. Legal pages (privacy, terms, code of conduct) do not exist
 * yet, so they render as disabled buttons with an explanatory label
 * instead of misleading spans that only look clickable.
 */
export const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-900 pt-16 pb-12 text-xs">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center" aria-label="Rudin Store home">
              <img
                src="/branding/footer-logo.svg"
                alt="Rudin Store"
                className="h-12 w-auto 'max-w-[210px]' object-contain"
              />
            </Link>

            <p className="text-slate-400 max-w-sm text-xs leading-relaxed">
              {t('footer.tagline')}
            </p>

            <div className="pt-2 text-[11px] text-slate-500 space-y-1">
              <p>{t('footer.noteEscrow')}</p>
              <p>{t('footer.noteShipping')}</p>
            </div>
          </div>

          {/* Departments */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
              {t('footer.departmentsTitle')}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/shop" className="hover:text-white transition-colors">
                  {t('footer.allProducts')}
                </Link>
              </li>
              <li>
                <Link to="/categories/electronics" className="hover:text-white transition-colors">
                  {t('footer.categoryElectronics')}
                </Link>
              </li>
              <li>
                <Link to="/categories/clothing" className="hover:text-white transition-colors">
                  {t('footer.categoryClothing')}
                </Link>
              </li>
              <li>
                <Link to="/categories/home-living" className="hover:text-white transition-colors">
                  {t('footer.categoryHomeLiving')}
                </Link>
              </li>
              <li>
                <Link to="/categories/kitchen-coffee" className="hover:text-white transition-colors">
                  {t('footer.categoryKitchenCoffee')}
                </Link>
              </li>
              <li>
                <Link to="/categories/bags-accessories" className="hover:text-white transition-colors">
                  {t('footer.categoryBagsAccessories')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Independent Stores */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
              {t('footer.makersTitle')}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/vendors" className="hover:text-white transition-colors">
                  {t('footer.vendorsDirectory')}
                </Link>
              </li>
              <li>
                <Link to="/seller/join" className="hover:text-white transition-colors">
                  {t('footer.applyMaker')}
                </Link>
              </li>
              <li>
                <Link
                  to="/seller/dashboard"
                  className="text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                >
                  {t('header.sellerDashboard')}
                </Link>
              </li>
              <li>
                <Link
                  to="/admin"
                  className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                >
                  {t('header.adminPortal')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Support */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
              {t('footer.accountTitle')}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/account/orders" className="hover:text-white transition-colors">
                  {t('footer.trackOrders')}
                </Link>
              </li>
              <li>
                <Link to="/account/wishlist" className="hover:text-white transition-colors">
                  {t('footer.savedWishlist')}
                </Link>
              </li>
              <li>
                <Link to="/account" className="hover:text-white transition-colors">
                  {t('footer.profileAddressBook')}
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-white transition-colors">
                  {t('footer.shoppingCart')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="border-t border-slate-900 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              disabled
              title={t('footer.pageUnavailable')}
              className="text-slate-500 disabled:cursor-not-allowed"
            >
              {t('footer.privacyPolicy')}
            </button>
            <span>•</span>
            <button
              type="button"
              disabled
              title={t('footer.pageUnavailable')}
              className="text-slate-500 disabled:cursor-not-allowed"
            >
              {t('footer.termsOfService')}
            </button>
            <span>•</span>
            <button
              type="button"
              disabled
              title={t('footer.pageUnavailable')}
              className="text-slate-500 disabled:cursor-not-allowed"
            >
              {t('footer.codeOfConduct')}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
