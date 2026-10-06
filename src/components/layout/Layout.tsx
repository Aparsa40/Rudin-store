import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { CartDrawer } from '../cart/CartDrawer';
import { QuickViewModal } from '../product/QuickViewModal';
import { ToastContainer } from '../ui/ToastContainer';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
      <Header />
      <main className="flex-grow">
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
