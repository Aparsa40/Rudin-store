import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Truck, RotateCcw, Clock } from 'lucide-react';
import { productsService, categoryService } from '../services/products.service';
import { Product, Category } from '../types';
import { ProductCard } from '../components/product/ProductCard';
import { Button } from '../components/ui/Button';

export const Home: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [productsData, categoriesData] = await Promise.all([
          productsService.getProducts(),
          categoryService.getCategories()
        ]);
        setFeaturedProducts(productsData.slice(0, 4));
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching home data', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[600px] bg-slate-900 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=2000" 
            alt="Hero background" 
            className="w-full h-full object-cover opacity-40"
          />
        </div>
        <div className="relative container mx-auto px-4 h-full flex flex-col justify-center max-w-4xl">
          <span className="inline-block px-3 py-1 bg-white/10 text-white backdrop-blur rounded-full text-sm font-medium mb-6 w-max">
            New Collection 2024
          </span>
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
            Discover Premium <br/> Independent Brands
          </h1>
          <p className="text-lg md:text-xl text-slate-200 mb-8 max-w-2xl">
            Shop curated collections from the world's best independent creators, artisans, and boutique brands.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/shop">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 font-bold px-8">
                Shop Now
              </Button>
            </Link>
            <Link to="/vendors">
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10 font-bold px-8">
                Explore Stores
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-b border-slate-200 bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 flex-shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Free Shipping</h4>
                <p className="text-sm text-slate-500">On all orders over $50</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 flex-shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Secure Checkout</h4>
                <p className="text-sm text-slate-500">100% protected payments</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 flex-shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Easy Returns</h4>
                <p className="text-sm text-slate-500">30-day return policy</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 flex-shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">24/7 Support</h4>
                <p className="text-sm text-slate-500">Dedicated customer help</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Shop by Category */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Shop by Category</h2>
              <p className="text-slate-500 mt-2">Find exactly what you're looking for</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            {categories.map((category) => (
              <Link 
                key={category.id} 
                to={`/categories/${category.slug}`}
                className="group flex flex-col items-center bg-white p-6 rounded-2xl border border-slate-200 hover:border-slate-400 hover:shadow-md transition-all"
              >
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-xl font-bold text-slate-400">{category.name.charAt(0)}</span>
                </div>
                <h3 className="font-medium text-slate-900 text-center">{category.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Trending Now</h2>
              <p className="text-slate-500 mt-2">Top picks from our community</p>
            </div>
            <Link to="/shop" className="hidden sm:flex items-center gap-2 text-slate-900 font-medium hover:text-blue-600 transition-colors">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-slate-200 aspect-square rounded-xl mb-4"></div>
                  <div className="h-4 bg-slate-200 rounded w-2/3 mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
                  <div className="h-6 bg-slate-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
          
          <div className="mt-8 text-center sm:hidden">
             <Link to="/shop">
              <Button variant="outline" className="w-full">View All Products</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Banner Section */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="bg-blue-600 rounded-3xl overflow-hidden flex flex-col md:flex-row relative">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=2000')] opacity-20 mix-blend-overlay bg-cover bg-center"></div>
            <div className="p-10 md:p-16 lg:p-24 flex-1 flex flex-col justify-center relative z-10">
              <span className="text-blue-200 font-bold uppercase tracking-wider mb-2 text-sm">Become a Seller</span>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Start selling on Rudin</h2>
              <p className="text-blue-100 mb-8 max-w-md text-lg">
                Join our community of independent brands and reach thousands of customers daily. Setup is easy and fast.
              </p>
              <div>
                <Link to="/seller/join">
                  <Button className="bg-white text-blue-900 hover:bg-slate-100 font-bold px-8 py-3">
                    Open Your Store
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
