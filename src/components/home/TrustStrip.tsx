import React from 'react';
import { Clock, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { useTranslation } from '../../i18n';

/**
 * Trust and guarantees strip. The four service promises come from the
 * existing marketplace copy and are translated in both languages.
 */
export const TrustStrip: React.FC = () => {
  const { t } = useTranslation();

  const items = [
    { icon: Truck, title: t('home.trustShippingTitle'), body: t('home.trustShippingBody') },
    {
      icon: ShieldCheck,
      title: t('home.trustAuthenticityTitle'),
      body: t('home.trustAuthenticityBody'),
    },
    { icon: RotateCcw, title: t('home.trustTrialTitle'), body: t('home.trustTrialBody') },
    { icon: Clock, title: t('home.trustCareTitle'), body: t('home.trustCareBody') },
  ];

  return (
    <section className="bg-white border-b border-slate-200 py-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {items.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 flex-shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">{title}</h4>
                <p className="text-[11px] text-slate-500">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
