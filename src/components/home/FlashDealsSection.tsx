import React, { useCallback, useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { productsService } from '../../services/products/productsService';
import { Product } from '../../types';
import { ProductCard } from '../product/ProductCard';
import { useTranslation } from '../../i18n';
import { formatCountdown } from '../../i18n';
import { SectionHeading } from './SectionHeading';
import { SectionEmpty, SectionError, SectionSkeleton } from './SectionState';

type LoadStatus = 'loading' | 'error' | 'ready';

/**
 * Flash deals section. Products come exclusively from the real
 * catalog API (`GET /api/products?flashDeal=true`). Prices, discounts,
 * and stock are never invented; a countdown is rendered only when the
 * product document carries a genuine `flashDealEndsAt` deadline.
 */
export const FlashDealsSection: React.FC = () => {
  const { t, language } = useTranslation();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [products, setProducts] = useState<Product[]>([]);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const deals = await productsService.getFlashDeals();
      setProducts(deals.slice(0, 8));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, tick]);

  // The earliest genuine deadline among the visible deals drives the
  // countdown. When no product carries flashDealEndsAt, no countdown
  // is shown — an honest omission rather than a fabricated timer.
  const deadline = products
    .map((product) => product.flashDealEndsAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((time) => !Number.isNaN(time))
    .sort((a, b) => a - b)[0];

  const [countdown, setCountdown] = useState(() =>
    deadline ? formatCountdown(deadline, language) : null,
  );

  useEffect(() => {
    if (!deadline) {
      setCountdown(null);
      return;
    }
    const update = () => setCountdown(formatCountdown(deadline, language));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [deadline, language]);

  if (status === 'ready' && products.length === 0) {
    return (
      <section className="py-12 bg-white border-y border-slate-200" id="flash-deals">
        <div className="container mx-auto px-4">
          <SectionHeading
            eyebrow={t('home.flashDealsEyebrow')}
            title={t('home.flashDealsTitle')}
          />
          <SectionEmpty
            title={t('home.flashDealsEmptyTitle')}
            body={t('home.flashDealsEmptyBody')}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-white border-y border-slate-200" id="flash-deals">
      <div className="container mx-auto px-4">
        <SectionHeading
          eyebrow={t('home.flashDealsEyebrow')}
          title={t('home.flashDealsTitle')}
          viewAllLabel={t('home.flashDealsViewAll')}
          viewAllTo="/shop"
        />

        {status === 'loading' && <SectionSkeleton count={4} />}
        {status === 'error' && (
          <SectionError
            message={t('home.flashDealsError')}
            retryLabel={t('common.retry')}
            onRetry={() => setTick((value) => value + 1)}
          />
        )}
        {status === 'ready' && products.length > 0 && (
          <>
            {countdown && (
              <div
                className="mb-6 inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r rtl:bg-gradient-to-l from-rose-500 to-orange-500 text-white shadow-md"
                aria-live="off"
              >
                <Flame className="w-4 h-4 fill-current" />
                <span className="text-xs font-bold">{t('home.flashDealsEndsIn')}</span>
                <div className="flex items-center gap-1.5 font-mono font-bold text-sm">
                  <span className="bg-white/20 px-2 py-1 rounded-lg tabular-nums">
                    {countdown.hours}
                  </span>
                  <span>{t('home.flashDealsHours')}</span>
                  <span className="bg-white/20 px-2 py-1 rounded-lg tabular-nums">
                    {countdown.minutes}
                  </span>
                  <span>{t('home.flashDealsMinutes')}</span>
                  <span className="bg-white/20 px-2 py-1 rounded-lg tabular-nums">
                    {countdown.seconds}
                  </span>
                  <span>{t('home.flashDealsSeconds')}</span>
                </div>
              </div>
            )}

            <div
              className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory no-scrollbar -mx-1 px-1"
              data-testid="flash-deals-row"
            >
              {products.map((product) => (
                <div
                  key={product.id}
                  className="w-[220px] sm:w-[240px] shrink-0 snap-start"
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};
