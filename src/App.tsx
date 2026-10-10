import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ResetPassword } from './pages/ResetPassword';
import { Account } from './pages/Account';
import { VendorsList } from './pages/VendorsList';
import { VendorDetail } from './pages/VendorDetail';
import { AdminDashboard } from './pages/AdminDashboard';
import { SellerDashboard } from './pages/SellerDashboard';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Button } from './components/ui/Button';

const NotFound: React.FC = () => (
  <div className="container mx-auto px-4 py-24 text-center max-w-md">
    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-black text-slate-400">
      404
    </div>
    <h1 className="text-2xl font-black text-slate-900 mb-2">Page Not Found</h1>
    <p className="text-xs text-slate-500 mb-6">
      The page or artisan collection you were looking for could not be found or has moved.
    </p>
    <div className="flex gap-3 justify-center">
      <Link to="/"><Button variant="outline" size="sm">Return Home</Button></Link>
      <Link to="/shop"><Button size="sm">Browse Catalog</Button></Link>
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="categories/:slug" element={<Shop />} />
          <Route path="product/:slug" element={<ProductDetail />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="account/*" element={<ProtectedRoute><Account /></ProtectedRoute>} />
          <Route path="vendors" element={<VendorsList />} />
          <Route path="vendors/:slug" element={<VendorDetail />} />
          <Route path="seller/dashboard" element={<ProtectedRoute allowedRoles={['VENDOR', 'ADMIN']}><SellerDashboard /></ProtectedRoute>} />
          <Route path="seller/join" element={<Register />} />
          <Route path="admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
