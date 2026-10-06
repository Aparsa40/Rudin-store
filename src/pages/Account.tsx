import React from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { User as UserIcon, Package, Heart, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';

export const Account: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-12 flex flex-col md:flex-row gap-8">
      {/* Sidebar */}
      <div className="md:w-64 flex-shrink-0">
        <div className="bg-slate-900 text-white rounded-2xl p-6 mb-6">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-2xl font-bold mb-4">
            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
          </div>
          <h2 className="text-xl font-bold">{user.firstName} {user.lastName}</h2>
          <p className="text-slate-400 text-sm">{user.email}</p>
        </div>

        <nav className="flex flex-col gap-1">
          <Link to="/account" className="flex items-center gap-3 px-4 py-3 bg-slate-100 text-slate-900 font-medium rounded-lg">
            <UserIcon className="w-5 h-5" /> Profile
          </Link>
          <Link to="/account/orders" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium rounded-lg transition-colors">
            <Package className="w-5 h-5" /> Orders
          </Link>
          <Link to="/account/wishlist" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium rounded-lg transition-colors">
            <Heart className="w-5 h-5" /> Wishlist
          </Link>
          <Link to="/account/settings" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium rounded-lg transition-colors">
            <Settings className="w-5 h-5" /> Settings
          </Link>
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 font-medium rounded-lg transition-colors text-left mt-4"
          >
            <LogOut className="w-5 h-5" /> Log Out
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {location.pathname.includes('/orders') ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Your Orders</h1>
            <div className="text-center py-12 text-slate-500">
              <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-900 mb-2">No orders found</p>
              <p className="mb-6">You haven't placed any orders yet.</p>
              <Link to="/shop"><Button>Start Shopping</Button></Link>
            </div>
          </div>
        ) : location.pathname.includes('/wishlist') ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Your Wishlist</h1>
            <div className="text-center py-12 text-slate-500">
              <Heart className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-900 mb-2">Your wishlist is empty</p>
              <p className="mb-6">Save items you love to your wishlist to buy them later.</p>
              <Link to="/shop"><Button>Discover Products</Button></Link>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-6">Personal Information</h1>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                  <input type="text" defaultValue={user.firstName} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none bg-slate-50" readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                  <input type="text" defaultValue={user.lastName} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none bg-slate-50" readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" defaultValue={user.email} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none bg-slate-50" readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input type="tel" placeholder="Not provided" defaultValue={user.phone} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-slate-400 outline-none" />
                </div>
              </div>
              
              <Button>Save Changes</Button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 mt-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Recent Orders</h2>
                <Link to="/account/orders" className="text-sm font-medium text-blue-600 hover:underline">View All</Link>
              </div>
              <div className="text-center py-8 text-slate-500">
                <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p>You haven't placed any orders yet.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
