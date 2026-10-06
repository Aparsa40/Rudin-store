import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Account } from './pages/Account';
import { VendorsList } from './pages/VendorsList';
import { VendorDetail } from './pages/VendorDetail';
import { AdminDashboard } from './pages/AdminDashboard';
import { SellerDashboard } from './pages/SellerDashboard';

const NotFound = () => <div className="p-8 text-center text-xl mt-20 font-bold text-red-500">404 - Page Not Found</div>;

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
          <Route path="account/*" element={<Account />} />
          <Route path="vendors" element={<VendorsList />} />
          <Route path="vendors/:slug" element={<VendorDetail />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="seller/dashboard" element={<SellerDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
