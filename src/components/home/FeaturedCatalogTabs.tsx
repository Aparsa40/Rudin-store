import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productsService } from '../../services/products/productsService';
import { Product } from '../../types';
import { ProductCard } from '../product/ProductCard';
import { useTranslation } from '../../i18n';
import { Button } from '../ui/Button';
import { SectionEmpty, SectionError, SectionSkeleton } from './SectionState';

type TabKey = 'trending' | 'bestSellers' | 'newArrivals';

type TabStatus = 'loading' | 'ready' | 'error';

interface TabState {
  status: TabStatus;
  products: Product[];
}

const EMPTY_TAB: TabState = { status: 'loading', products: [] };

/**
 * Featured catalog tabs (trending / best sellers / new arrivals). Each
 * tab loads from its real catalog API endpoint independently, so one
 * failing request degrades only its own tab instead of the section.
 */
export const FeaturedCatalogTabs: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('trending');
  const [tabs, setTabs] = useState<Record<TabKey, TabState>>({
    trending: EMPTY_TAB,
    bestSellers: EMPTY_TAB,
    newArrivals: EMPTY_TAB,
  });
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setTabs({ trending: EMPTY_TAB, bestSellers: EMPTY_TAB, newArrivals: EMPTY_TAB });
    const loaders: Record<TabKey, () => Promise<Product[]>> = {
      trending: () => productsService.getFeaturedProducts(8),
      bestSellers: () => productsService.getBestSellers(8),
      newArrivals: () => productsService.getNewArrivals(8),
    };
    (Object.keys(loaders) as TabKey[]).forEach(async (key) => {
      try {
        const products = await loaders[key]();
        setTabs((prev) => ({ ...prev, [key]: { status: 'ready', products } }));
      } catch {
        setTabs((prev) => ({ ...prev, [key]: { status: 'error', products: [] } }));
      }
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load, tick]);

  const tabLabels: Record<TabKey, string> = {
    trending: t('home.tabTrending'),
    bestSellers: t('home.tabBestSellers'),
    newArrivals: t('home.tabNewArrivals'),
  };

  const current = tabs[activeTab];

  return (
    <section className="py-16 bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-200 pb-4">
          <div>
            <span className="text-xs font-bold tracking-wider text-blue-600 uppercase">
              {t('home.tabsEyebrow')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {t('home.tabsTitle')}
            </h2>
          </div>

          <div
            className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl"
            role="tablist"
            aria-label={t('home.tabsTitle')}
          >
            {(Object.keys(tabLabels) as TabKey[]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeTab === key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                  activeTab === key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tabLabels[key]}
              </button>
            ))}
          </div>
        </div>

        {current.status === 'loading' && <SectionSkeleton count={8} />}
        {current.status === 'error' && (
          <SectionError
            message={t('home.tabsError')}
            retryLabel={t('common.retry')}
            onRetry={() => setTick((value) => value + 1)}
          />
        )}
        {current.status === 'ready' &&
          (current.products.length === 0 ? (
            <SectionEmpty
              title={t('home.tabsEmptyTitle')}
              body={t('home.tabsEmptyBody')}
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {current.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ))}

        <div className="mt-12 text-center">
          <Link to="/shop">
            <Button
              size="lg"
              variant="outline"
              className="border-slate-300 text-slate-900 font-bold px-8"
            >
              {t('home.tabsViewAll')}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
