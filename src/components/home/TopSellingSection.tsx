import React, { useCallback, useEffect, useState } from 'react';
import { productsService } from '../../services/products/productsService';
import { Product } from '../../types';
import { ProductCard } from '../product/ProductCard';
import { useTranslation } from '../../i18n';
import { SectionHeading } from './SectionHeading';
import { SectionEmpty, SectionError, SectionSkeleton } from './SectionState';

type LoadStatus = 'loading' | 'error' | 'ready';

/**
 * Top-selling products grid. Data comes exclusively from the real
 * catalog API (`GET /api/products?bestSeller=true`); ranking, prices,
 * and stock are never fabricated.
 */
export const TopSellingSection: React.FC = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [products, setProducts] = useState<Product[]>([]);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setProducts(await productsService.getBestSellers(8));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, tick]);

  return (
    <section className="py-12 bg-white" id="top-selling">
      <div className="container mx-auto px-4">
        <SectionHeading
          eyebrow={t('home.topSellingEyebrow')}
          title={t('home.topSellingTitle')}
          viewAllLabel={t('home.topSellingViewAll')}
          viewAllTo="/shop"
        />

        {status === 'loading' && <SectionSkeleton count={8} />}
        {status === 'error' && (
          <SectionError
            message={t('home.topSellingError')}
            retryLabel={t('common.retry')}
            onRetry={() => setTick((value) => value + 1)}
          />
        )}
        {status === 'ready' &&
          (products.length === 0 ? (
            <SectionEmpty
              title={t('home.topSellingEmptyTitle')}
              body={t('home.topSellingEmptyBody')}
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ))}
      </div>
    </section>
  );
};
