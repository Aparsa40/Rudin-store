import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { productsService } from '../../services/products/productsService';

interface SearchBarProps {
  onSelect?: () => void;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSelect, className = '' }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<{
    products: { id: string; title: string; slug: string; price: number; image: string }[];
    popular: string[];
  }>({ products: [], popular: [] });
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load recent searches on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('rudin_recent_searches');
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch (e) {
      // Ignore
    }
  }, []);

  // Fetch suggestions with debounce
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      const res = await productsService.searchSuggestions(query);
      if (active) {
        setSuggestions(res);
        setIsLoading(false);
      }
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (searchWord: string) => {
    const term = searchWord.trim();
    if (!term) return;

    // Save to recent searches
    const updated = [
      term,
      ...recentSearches.filter((s) => s.toLowerCase() !== term.toLowerCase()),
    ].slice(0, 5);
    setRecentSearches(updated);
    try {
      localStorage.setItem('rudin_recent_searches', JSON.stringify(updated));
    } catch (e) {}

    setIsOpen(false);
    if (onSelect) onSelect();
    navigate(`/shop?q=${encodeURIComponent(term)}`);
  };

  const handleClearRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem('rudin_recent_searches');
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearchSubmit(query);
        }}
        className="relative"
      >
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search artisanal audio, raw denim, ceramics, makers..."
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            className="w-full pl-10 pr-10 py-2.5 bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-sm text-slate-900 placeholder-slate-400 rounded-full border border-transparent focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5 outline-none transition-all duration-200"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setIsOpen(true);
              }}
              className="absolute right-3.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Recent Searches
                </span>
                <button
                  onClick={handleClearRecent}
                  className="text-slate-400 hover:text-slate-700 font-normal lowercase hover:underline"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentSearches.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuery(item);
                      handleSearchSubmit(item);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-medium rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <span>{item}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular Searches */}
          {!query && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Trending Topics
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.popular.map((pop, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuery(pop);
                      handleSearchSubmit(pop);
                    }}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-800 font-medium rounded-lg transition-colors"
                  >
                    {pop}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live Product Suggestions */}
          {query && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1 flex items-center justify-between">
                <span>Matching Products</span>
                {isLoading && (
                  <span className="text-[11px] font-normal lowercase">Searching...</span>
                )}
              </div>

              {suggestions.products.length > 0 ? (
                <div className="space-y-1">
                  {suggestions.products.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        if (onSelect) onSelect();
                        navigate(`/product/${p.slug}`);
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 text-left transition-colors group"
                    >
                      <img
                        src={p.image}
                        alt={p.title}
                        className="w-10 h-10 rounded-lg object-cover bg-slate-100 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 group-hover:text-blue-600 truncate transition-colors">
                          {p.title}
                        </div>
                        <div className="text-xs font-semibold text-slate-700">
                          ${p.price.toFixed(2)}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => handleSearchSubmit(query)}
                    className="w-full mt-2 pt-2 border-t border-slate-100 text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1.5 py-1.5"
                  >
                    View all results for "{query}" <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-slate-500">
                  No direct products found for "{query}". Press enter to search all catalog tags and
                  descriptions.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
