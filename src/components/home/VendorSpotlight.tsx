import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Star, Store } from 'lucide-react';
import { vendorsService } from '../../services/vendors/vendorsService';
import { Vendor } from '../../types';
import { useTranslation } from '../../i18n';
import { Button } from '../ui/Button';
import { SectionHeading } from './SectionHeading';
import { SectionEmpty, SectionError } from './SectionState';

type LoadStatus = 'loading' | 'error' | 'ready';

/**
 * Featured independent stores. Vendors come from the real vendor
 * service; the backend exposes public fields only, so missing banner
 * and logo URLs render neutral placeholders and a rating is shown only
 * when the vendor record carries genuine review data.
 */
export const VendorSpotlight: React.FC = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const all = await vendorsService.getVendors();
      setVendors(all.slice(0, 3));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, tick]);

  return (
    <section className="py-16 bg-white border-y border-slate-200">
      <div className="container mx-auto px-4">
        <SectionHeading
          eyebrow={t('home.vendorsEyebrow')}
          title={t('home.vendorsTitle')}
          subtitle={t('home.vendorsSubtitle')}
          viewAllLabel={t('home.vendorsViewAll')}
          viewAllTo="/vendors"
        />

        {status === 'loading' && (
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            aria-busy="true"
            data-testid="vendors-loading"
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-pulse"
              >
                <div className="h-32 bg-slate-100" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-1/2 bg-slate-100 rounded" />
                  <div className="h-3 w-3/4 bg-slate-100 rounded" />
                  <div className="h-9 w-full bg-slate-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        )}
        {status === 'error' && (
          <SectionError
            message={t('common.errorTitle')}
            retryLabel={t('common.retry')}
            onRetry={() => setTick((value) => value + 1)}
          />
        )}
        {status === 'ready' &&
          (vendors.length === 0 ? (
            <SectionEmpty
              title={t('home.vendorsEmptyTitle')}
              body={t('home.vendorsEmptyBody')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {vendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                >
                  <div className="relative h-32 bg-slate-100 overflow-hidden">
                    {vendor.bannerUrl ? (
                      <img
                        src={vendor.bannerUrl}
                        alt={vendor.storeName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Store className="w-8 h-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-slate-900/20" />
                  </div>

                  <div className="p-5 pt-0 flex-1 flex flex-col relative">
                    <div className="-mt-7 mb-3 flex items-end justify-between">
                      {vendor.logoUrl ? (
                        <img
                          src={vendor.logoUrl}
                          alt={vendor.storeName}
                          className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow-md bg-white"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-100 border-2 border-white shadow-md flex items-center justify-center text-slate-400">
                          <Store className="w-6 h-6" />
                        </div>
                      )}
                      {vendor.reviewCount > 0 && (
                        <div className="flex items-center gap-1 text-xs font-bold text-slate-900 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{vendor.rating.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                      {vendor.storeName}
                      {vendor.isVerified && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 fill-blue-50" />
                      )}
                    </h3>

                    {vendor.location && (
                      <p className="text-xs text-slate-500 mb-2 font-medium">{vendor.location}</p>
                    )}

                    {vendor.description && (
                      <p className="text-xs text-slate-600 line-clamp-3 mb-5 leading-relaxed flex-1">
                        {vendor.description}
                      </p>
                    )}

                    <Link to={`/vendors/${vendor.slug}`} className="mt-auto">
                      <Button variant="outline" className="w-full text-xs font-bold border-slate-200">
                        {t('home.vendorsVisitStore')}
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ))}
      </div>
    </section>
  );
};
