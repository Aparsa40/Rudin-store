import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  SlidersHorizontal,
  ChevronDown,
  Search,
  Grid3X3,
  List,
  X,
  Star,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { productsService } from '../services/products/productsService';
import { categoriesService } from '../services/categories/categoriesService';
import { vendorsService } from '../services/vendors/vendorsService';
import { Product, Category, Vendor, ProductFilterParams } from '../types';
import { ProductCard } from '../components/product/ProductCard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Drawer } from '../components/ui/Drawer';

export const Shop: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQ = searchParams.get('q') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View Mode: grid or list
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>(slug || '');
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [minRating, setMinRating] = useState<number | undefined>(undefined);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [sortBy, setSortBy] = useState<ProductFilterParams['sortBy']>('featured');
  const [currentPage, setCurrentPage] = useState(1);

  // Mobile Filter Drawer
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Update selectedCategory if URL param slug changes
  useEffect(() => {
    setSelectedCategory(slug || '');
    setCurrentPage(1);
  }, [slug]);

  // Load master data (categories & vendors)
  useEffect(() => {
    Promise.all([categoriesService.getCategories(), vendorsService.getVendors()]).then(
      ([cats, vends]) => {
        setCategories(cats);
        setVendors(vends);
      },
    );
  }, []);

  // Fetch filtered products
  useEffect(() => {
    let active = true;
    const fetchCatalog = async () => {
      setIsLoading(true);

      // Find category id if category slug is selected
      let catId: string | undefined = undefined;
      if (selectedCategory) {
        const found = categories.find(
          (c) => c.slug === selectedCategory || c.id === selectedCategory,
        );
        if (found) catId = found.id;
      }

      const params: ProductFilterParams = {
        categoryId: catId,
        vendorId: selectedVendor || undefined,
        searchQuery: searchQ || undefined,
        minPrice,
        maxPrice,
        minRating,
        inStockOnly,
        onSaleOnly,
        sortBy,
        page: currentPage,
        limit: 12,
      };

      const res = await productsService.getProducts(params);
      if (active) {
        setProducts(res.products);
        setTotalProducts(res.total);
        setIsLoading(false);
      }
    };

    fetchCatalog();
    return () => {
      active = false;
    };
  }, [
    selectedCategory,
    selectedVendor,
    searchQ,
    minPrice,
    maxPrice,
    minRating,
    inStockOnly,
    onSaleOnly,
    sortBy,
    currentPage,
    categories,
  ]);

  const handleResetFilters = () => {
    setSelectedCategory('');
    setSelectedVendor('');
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setMinRating(undefined);
    setInStockOnly(false);
    setOnSaleOnly(false);
    setSortBy('featured');
    setCurrentPage(1);
    if (searchQ) {
      setSearchParams({});
    }
  };

  const hasActiveFilters =
    Boolean(selectedCategory) ||
    Boolean(selectedVendor) ||
    Boolean(searchQ) ||
    minPrice !== undefined ||
    maxPrice !== undefined ||
    minRating !== undefined ||
    inStockOnly ||
    onSaleOnly;

  // Filter Sidebar Content (Shared between desktop sidebar & mobile drawer)
  const FilterControls = (
    <div className="space-y-6">
      {/* Category Filter */}
      <div>
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          Categories
        </h4>
        <div className="space-y-1.5">
          <button
            onClick={() => {
              setSelectedCategory('');
              setCurrentPage(1);
            }}
            className={`w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg transition-colors text-left ${
              !selectedCategory
                ? 'bg-slate-900 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>All Categories</span>
            <span>{totalProducts}</span>
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCategory(c.slug);
                setCurrentPage(1);
              }}
              className={`w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg transition-colors text-left ${
                selectedCategory === c.slug
                  ? 'bg-slate-900 text-white font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="truncate pr-2">{c.name}</span>
              <span className="text-[11px] opacity-75">{c.productCount}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="pt-4 border-t border-slate-200">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          Price ($ USD)
        </h4>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minPrice !== undefined ? minPrice : ''}
            onChange={(e) => {
              setMinPrice(e.target.value ? Number(e.target.value) : undefined);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-400"
          />
          <span className="text-slate-400 text-xs">–</span>
          <input
            type="number"
            placeholder="Max"
            value={maxPrice !== undefined ? maxPrice : ''}
            onChange={(e) => {
              setMaxPrice(e.target.value ? Number(e.target.value) : undefined);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {/* Rating Filter */}
      <div className="pt-4 border-t border-slate-200">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          Minimum Rating
        </h4>
        <div className="space-y-1.5">
          {[4, 4.5, 4.8].map((stars) => (
            <label
              key={stars}
              className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 hover:text-slate-900"
            >
              <input
                type="radio"
                name="rating"
                checked={minRating === stars}
                onChange={() => {
                  setMinRating(stars);
                  setCurrentPage(1);
                }}
                className="text-slate-900 focus:ring-slate-900"
              />
              <span className="flex items-center gap-1 font-medium">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{stars} Stars & Above</span>
              </span>
            </label>
          ))}
          {minRating !== undefined && (
            <button
              onClick={() => setMinRating(undefined)}
              className="text-[11px] text-blue-600 hover:underline pt-1 block"
            >
              Clear rating filter
            </button>
          )}
        </div>
      </div>

      {/* Vendors Selection */}
      <div className="pt-4 border-t border-slate-200">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          Independent Stores
        </h4>
        <div className="space-y-1.5">
          {vendors.map((v) => (
            <label
              key={v.id}
              className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 hover:text-slate-900"
            >
              <input
                type="radio"
                name="vendor"
                checked={selectedVendor === v.id}
                onChange={() => {
                  setSelectedVendor(selectedVendor === v.id ? '' : v.id);
                  setCurrentPage(1);
                }}
                className="text-slate-900 focus:ring-slate-900"
              />
              <span className="truncate">{v.storeName}</span>
            </label>
          ))}
          {selectedVendor && (
            <button
              onClick={() => setSelectedVendor('')}
              className="text-[11px] text-blue-600 hover:underline pt-1 block"
            >
              All stores
            </button>
          )}
        </div>
      </div>

      {/* Availability / Sale Toggles */}
      <div className="pt-4 border-t border-slate-200 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => {
              setInStockOnly(e.target.checked);
              setCurrentPage(1);
            }}
            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
          <span className="font-medium">In Stock Items Only</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
          <input
            type="checkbox"
            checked={onSaleOnly}
            onChange={(e) => {
              setOnSaleOnly(e.target.checked);
              setCurrentPage(1);
            }}
            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
          <span className="font-medium text-rose-600">On Sale / Deals Only</span>
        </label>
      </div>

      {hasActiveFilters && (
        <div className="pt-4 border-t border-slate-200">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="w-full text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset All Filters
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 mb-6">
        <Link to="/" className="hover:text-slate-700">
          Home
        </Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-slate-700">
          Marketplace
        </Link>
        {selectedCategory && (
          <>
            <span>/</span>
            <span className="text-slate-900 font-bold capitalize">
              {selectedCategory.replace(/-/g, ' ')}
            </span>
          </>
        )}
      </nav>

      {/* Title & Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-slate-200 gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {searchQ
              ? `Results for "${searchQ}"`
              : selectedCategory
                ? categories.find((c) => c.slug === selectedCategory)?.name || 'Department Catalog'
                : 'All Marketplace Goods'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Showing {products.length} of {totalProducts} verified handcrafted and engineered
            products
          </p>
        </div>

        {/* View Switcher, Sort Dropdown & Mobile Filter Button */}
        <div className="flex items-center gap-3">
          {/* Mobile Filter Trigger */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMobileFiltersOpen(true)}
            className="lg:hidden text-xs font-bold gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-blue-600" />}
          </Button>

          {/* Grid vs List View Mode */}
          <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Grid View"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as ProductFilterParams['sortBy']);
                setCurrentPage(1);
              }}
              className="appearance-none bg-white border border-slate-200 text-xs font-semibold text-slate-900 py-2.5 pl-3 pr-8 rounded-xl outline-none focus:border-slate-400 cursor-pointer shadow-sm"
            >
              <option value="featured">Sort by: Curated & Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Highest Customer Rating</option>
              <option value="newest">Newest Releases</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Active Filter Pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-6 pb-2">
          <span className="text-xs font-semibold text-slate-400 mr-1">Active Filters:</span>
          {selectedCategory && (
            <Badge variant="primary" size="sm" className="gap-1">
              Cat: {selectedCategory}
              <button onClick={() => setSelectedCategory('')}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {selectedVendor && (
            <Badge variant="purple" size="sm" className="gap-1">
              Store: {vendors.find((v) => v.id === selectedVendor)?.storeName}
              <button onClick={() => setSelectedVendor('')}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {minPrice !== undefined && (
            <Badge variant="secondary" size="sm" className="gap-1">
              Min: ${minPrice}
              <button onClick={() => setMinPrice(undefined)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {maxPrice !== undefined && (
            <Badge variant="secondary" size="sm" className="gap-1">
              Max: ${maxPrice}
              <button onClick={() => setMaxPrice(undefined)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {minRating !== undefined && (
            <Badge variant="secondary" size="sm" className="gap-1">
              {minRating}★+
              <button onClick={() => setMinRating(undefined)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {inStockOnly && (
            <Badge variant="success" size="sm" className="gap-1">
              In Stock
              <button onClick={() => setInStockOnly(false)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {onSaleOnly && (
            <Badge variant="danger" size="sm" className="gap-1">
              On Sale
              <button onClick={() => setOnSaleOnly(false)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          <button
            onClick={handleResetFilters}
            className="text-xs text-blue-600 hover:text-blue-800 font-bold ml-2 hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Main Layout: Filters Sidebar + Products Grid */}
      <div className="flex gap-8">
        {/* Desktop Filter Sidebar */}
        <aside className="w-64 flex-shrink-0 hidden lg:block">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sticky top-24 shadow-sm">
            {FilterControls}
          </div>
        </aside>

        {/* Product Catalog Display */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse space-y-4"
                >
                  <div className="aspect-square bg-slate-200 rounded-xl" />
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-5 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div>
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
                    : 'flex flex-col gap-4'
                }
              >
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} viewMode={viewMode} />
                ))}
              </div>

              {/* Pagination */}
              {totalProducts > 12 && (
                <div className="flex justify-center items-center gap-2 mt-12 pt-8 border-t border-slate-200">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-xs font-bold text-slate-700 px-4">
                    Page {currentPage} of {Math.ceil(totalProducts / 12)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= Math.ceil(totalProducts / 12)}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Empty State */
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-4">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No matching products found</h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                We couldn't find items matching your active filter combination. Try clearing your
                filters or search term to discover all artisan collections.
              </p>
              <Button onClick={handleResetFilters} size="sm">
                Reset All Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      <Drawer
        isOpen={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        title="Filter & Refine"
      >
        <div className="p-6">{FilterControls}</div>
      </Drawer>
    </div>
  );
};
