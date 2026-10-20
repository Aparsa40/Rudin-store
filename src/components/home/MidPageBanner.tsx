import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { MID_PAGE_BANNER } from '../../config/homeContent';
import { Button } from '../ui/Button';

/**
 * Mid-page promotional banner rendered from the documented
 * configuration source (`src/config/homeContent.ts`). No campaign API
 * exists yet; when one does, this component can be fed from it without
 * layout changes.
 */
export const MidPageBanner: React.FC = () => {
  const { language } = useTranslation();

  if (!MID_PAGE_BANNER.enabled) return null;

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <div
          className={`relative overflow-hidden rounded-3xl bg-gradient-to-r rtl:bg-gradient-to-l ${MID_PAGE_BANNER.gradient} text-white p-8 sm:p-12 shadow-xl`}
        >
          <div className="max-w-xl space-y-4 relative z-10">
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
              {MID_PAGE_BANNER.title[language]}
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              {MID_PAGE_BANNER.body[language]}
            </p>
            <div className="pt-3">
              <Link to={MID_PAGE_BANNER.ctaHref}>
                <Button className="bg-white text-slate-950 hover:bg-slate-100 font-bold px-6 h-11">
                  {MID_PAGE_BANNER.ctaLabel[language]}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
