import React from 'react';
import { Users, ShoppingCart, Package, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { mockProducts, mockVendors, mockCategories } from '../data/mockData';

export const AdminDashboard: React.FC = () => {
  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-50">
      {/* Admin Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-white font-bold text-lg">Admin Portal</h2>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            <li><a href="#" className="flex items-center gap-3 px-3 py-2 bg-blue-600 text-white rounded-lg"><TrendingUp className="w-4 h-4" /> Overview</a></li>
            <li><a href="#" className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"><ShoppingCart className="w-4 h-4" /> Orders</a></li>
            <li><a href="#" className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"><Package className="w-4 h-4" /> Products</a></li>
            <li><a href="#" className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"><Users className="w-4 h-4" /> Vendors</a></li>
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard Overview</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Revenue</p>
                <h3 className="text-2xl font-bold text-slate-900">$124,500</h3>
              </div>
              <div className="p-2 bg-green-100 text-green-600 rounded-lg"><DollarSign className="w-5 h-5" /></div>
            </div>
            <div className="text-sm text-green-600 font-medium flex items-center gap-1">+14.5% from last month</div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-slate-500 font-medium">Active Vendors</p>
                <h3 className="text-2xl font-bold text-slate-900">{mockVendors.length}</h3>
              </div>
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Users className="w-5 h-5" /></div>
            </div>
            <div className="text-sm text-blue-600 font-medium flex items-center gap-1">+2 new this week</div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Products</p>
                <h3 className="text-2xl font-bold text-slate-900">{mockProducts.length}</h3>
              </div>
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Package className="w-5 h-5" /></div>
            </div>
            <div className="text-sm text-slate-500 font-medium flex items-center gap-1">Across {mockCategories.length} categories</div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-slate-500 font-medium">Orders Pending</p>
                <h3 className="text-2xl font-bold text-slate-900">42</h3>
              </div>
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><ShoppingCart className="w-5 h-5" /></div>
            </div>
            <div className="text-sm text-amber-600 font-medium flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Requires attention</div>
          </div>
        </div>

        {/* Recent Vendors Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="font-bold text-slate-900">Recent Vendors</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-sm">
                <tr>
                  <th className="px-6 py-3 font-medium">Store Name</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Rating</th>
                  <th className="px-6 py-3 font-medium">Joined</th>
                  <th className="px-6 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {mockVendors.map(vendor => (
                  <tr key={vendor.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{vendor.storeName}</td>
                    <td className="px-6 py-4">
                      {vendor.isVerified ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Verified</span>
                      ) : (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{vendor.rating.toFixed(1)}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(vendor.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <button className="text-blue-600 hover:underline text-sm font-medium">Manage</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
