import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, ChevronDown, Search } from 'lucide-react';
import { productsService, categoryService, vendorService } from '../services/products.service';
import { Product, Category, Vendor } from '../types';
import { ProductCard } from '../components/product/ProductCard';
import { Button } from '../components/ui/Button';

export const Shop: React.FC = () => {
  const { slug } = useParams<{ slug: string }>(); // category slug
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [cats, vends] = await Promise.all([
          categoryService.getCategories(),
          vendorService.getVendors()
        ]);
        setCategories(cats);
        setVendors(vends);

        let productsData: Product[] = [];
        
        if (searchQuery) {
          productsData = await productsService.searchProducts(searchQuery);
        } else if (slug) {
          const category = cats.find(c => c.slug === slug);
          if (category) {
            productsData = await productsService.getProductsByCategory(category.id);
          } else {
            productsData = [];
          }
        } else {
          productsData = await productsService.getProducts();
        }
        
        setProducts(productsData);
      } catch (error) {
        console.error('Error fetching shop data', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [slug, searchQuery]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          {searchQuery ? (
            <h1 className="text-3xl font-bold text-slate-900">Search Results for "{searchQuery}"</h1>
          ) : slug ? (
            <h1 className="text-3xl font-bold text-slate-900 capitalize">{slug.replace('-', ' ')}</h1>
          ) : (
            <h1 className="text-3xl font-bold text-slate-900">All Products</h1>
          )}
          <p className="text-slate-500 mt-2">{products.length} products found</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="md:hidden"
            onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" /> Filters
          </Button>
          
          <div className="relative inline-block text-left hidden md:block">
            <Button variant="outline">
              Sort by: Recommended <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters - Desktop */}
        <div className={`md:w-64 flex-shrink-0 ${isMobileFiltersOpen ? 'block' : 'hidden md:block'}`}>
          <div className="bg-white border border-slate-200 rounded-xl p-5 sticky top-24">
            
            <div className="mb-6">
              <h3 className="font-bold text-slate-900 mb-3">Categories</h3>
              <ul className="space-y-2">
                {categories.map(c => (
                  <li key={c.id}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-slate-300 text-slate-900 focus:ring-slate-900" defaultChecked={c.slug === slug} />
                      <span className="text-sm text-slate-600 hover:text-slate-900">{c.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-6">
              <h3 className="font-bold text-slate-900 mb-3">Price Range</h3>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="Min" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-slate-400" />
                <span className="text-slate-400">-</span>
                <input type="number" placeholder="Max" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-slate-400" />
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-bold text-slate-900 mb-3">Vendors</h3>
              <ul className="space-y-2">
                {vendors.map(v => (
                  <li key={v.id}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                      <span className="text-sm text-slate-600 hover:text-slate-900">{v.storeName}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <Button className="w-full">Apply Filters</Button>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-slate-200 aspect-square rounded-xl mb-4"></div>
                  <div className="h-4 bg-slate-200 rounded w-2/3 mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
                  <div className="h-6 bg-slate-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white border border-slate-200 rounded-xl">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No products found</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                We couldn't find anything matching your criteria. Try adjusting your filters or search term.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
