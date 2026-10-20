import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Coffee,
  Headphones,
  Home as HomeIcon,
  Layers,
  Shirt,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { categoriesService } from '../../services/categories/categoriesService';
import { Category } from '../../types';
import { useTranslation } from '../../i18n';
import { SectionEmpty, SectionError, SectionSkeleton } from './SectionState';

type LoadStatus = 'loading' | 'error' | 'ready';

/**
 * Maps a supported category slug to a shortcut icon. Only categories
 * that actually exist in the application data appear here; no
 * unsupported categories are invented.
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  electronics: Headphones,
  clothing: Shirt,
  'home-living': HomeIcon,
  'kitchen-coffee': Coffee,
  'bags-accessories': Briefcase,
  'wellness-beauty': Sparkles,
};

const FALLBACK_ICON: LucideIcon = Layers;

/**
 * Circular category shortcuts rendered from the categories the
 * application actually supports (via `categoriesService`). Category
 * names come from the data source and are displayed as provided —
 * database content is never auto-translated.
 */
export const CategoryShortcuts: React.FC = () => {
  const { t, formatNumber } = useTranslation();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [categories, setCategories] = useState<Category[]>([]);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setCategories(await categoriesService.getCategories());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, tick]);

  if (status === 'ready' && categories.length === 0) {
    return (
      <section className="py-12 bg-slate-50" id="shop-by-category">
        <div className="container mx-auto px-4">
          <SectionEmpty
            title={t('home.categoriesTitle')}
            body={t('home.categoriesViewAll')}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-slate-50" id="shop-by-category">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <span className="text-xs font-bold tracking-wider text-blue-600 uppercase">
            {t('home.categoriesEyebrow')}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {t('home.categoriesTitle')}
          </h2>
          <p className="mt-2">
            <Link
              to="/shop"
              className="text-xs font-bold text-slate-900 hover:text-blue-600"
            >
              {t('home.categoriesViewAll')}
            </Link>
          </p>
        </div>

        {status === 'loading' && (
          <div className="flex justify-center gap-6" aria-busy="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="w-20 h-20 rounded-full bg-slate-200 animate-pulse"
              />
            ))}
          </div>
        )}
        {status === 'error' && (
          <div className="max-w-md mx-auto">
            <SectionError
              message={t('common.errorTitle')}
              retryLabel={t('common.retry')}
              onRetry={() => setTick((value) => value + 1)}
            />
          </div>
        )}
        {status === 'ready' && (
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-8">
            {categories.map((category) => {
              const Icon = CATEGORY_ICONS[category.slug] ?? FALLBACK_ICON;
              return (
                <Link
                  key={category.id}
                  to={`/categories/${category.slug}`}
                  className="group flex w-24 flex-col items-center gap-2.5 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl"
                >
                  <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-sm group-hover:border-blue-300 group-hover:text-blue-600 group-hover:shadow-lg transition-all">
                    <Icon className="w-7 h-7" />
                  </span>
                  <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 leading-snug transition-colors">
                    {category.name}
                  </span>
                  {typeof category.productCount === 'number' && (
                    <span className="text-[11px] text-slate-400">
                      {t('home.categoriesItems', {
                        count: formatNumber(category.productCount),
                      })}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
