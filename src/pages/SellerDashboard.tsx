import React from 'react';
import { Package, ShoppingBag, DollarSign, TrendingUp, Plus } from 'lucide-react';
import { mockProducts } from '../data/mockData';
import { Button } from '../components/ui/Button';

export const SellerDashboard: React.FC = () => {
  // Simulate a specific vendor's products
  const vendorProducts = mockProducts.filter(p => p.vendorId === 'v1');

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              TH
            </div>
            <div>
              <h2 className="font-bold text-slate-900 leading-tight">TechHaven</h2>
              <span className="text-xs text-slate-500">Seller Dashboard</span>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-4">
            <li><a href="#" className="flex items-center gap-3 px-3 py-2 bg-slate-100 text-slate-900 font-medium rounded-lg"><TrendingUp className="w-5 h-5" /> Overview</a></li>
            <li><a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"><ShoppingBag className="w-5 h-5" /> Orders</a></li>
            <li><a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"><Package className="w-5 h-5" /> Products</a></li>
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <Button className="gap-2"><Plus className="w-4 h-4"/> Add Product</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-slate-500 font-medium">Monthly Sales</p>
                <h3 className="text-2xl font-bold text-slate-900">$12,450</h3>
              </div>
              <div className="p-2 bg-green-100 text-green-600 rounded-lg"><DollarSign className="w-5 h-5" /></div>
            </div>
            <div className="text-sm text-green-600 font-medium">+8% from last month</div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-slate-500 font-medium">Active Products</p>
                <h3 className="text-2xl font-bold text-slate-900">{vendorProducts.length}</h3>
              </div>
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Package className="w-5 h-5" /></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-slate-500 font-medium">Pending Orders</p>
                <h3 className="text-2xl font-bold text-slate-900">14</h3>
              </div>
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><ShoppingBag className="w-5 h-5" /></div>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-900">Your Products</h3>
            <a href="#" className="text-sm font-medium text-blue-600 hover:underline">View all</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-sm">
                <tr>
                  <th className="px-6 py-3 font-medium">Product</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Price</th>
                  <th className="px-6 py-3 font-medium">Stock</th>
                  <th className="px-6 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {vendorProducts.map(product => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded overflow-hidden bg-slate-100">
                          {product.images[0] && <img src={product.images[0].url} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{product.title}</p>
                          <p className="text-xs text-slate-500 line-clamp-1">{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {product.status === 'PUBLISHED' ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Active</span>
                      ) : (
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">Draft</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium">${product.price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {product.variants.reduce((sum, v) => sum + v.stockQuantity, 0)} units
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-blue-600 hover:underline text-sm font-medium">Edit</button>
                    </td>
                  </tr>
                ))}
                {vendorProducts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      No products found. Add your first product to start selling.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
