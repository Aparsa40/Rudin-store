import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { CartDrawer } from '../cart/CartDrawer';
import { QuickViewModal } from '../product/QuickViewModal';
import { ToastContainer } from '../ui/ToastContainer';
import { useDocumentLanguage } from '../../i18n';

export const Layout: React.FC = () => {
  const { hash } = useLocation();
  // Keeps <html lang> and <html dir> in sync with the active language.
  useDocumentLanguage();

  // In-page anchors (for example /#flash-deals) scroll to the section
  // after navigation; the reduced-motion preference disables the
  // smooth scrolling animation.
  useEffect(() => {
    if (!hash || typeof document === 'undefined') return;
    const target = document.getElementById(hash.replace('#', ''));
    if (!target) return;
    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }, [hash]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
      <Header />
      <main className='grow'>
        <Outlet />
      </main>
      <Footer />

      {/* Global Overlays */}
      <CartDrawer />
      <QuickViewModal />
      <ToastContainer />
    </div>
  );
};
