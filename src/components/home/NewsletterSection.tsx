import React from 'react';
import { Mail } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { Button } from '../ui/Button';

/**
 * Newsletter strip. No newsletter backend or subscription service
 * exists yet, so the form is presented in an honest disabled state
 * instead of simulating a successful subscription.
 */
export const NewsletterSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="py-16 bg-slate-900 text-white">
      <div className="container mx-auto px-4 max-w-4xl text-center space-y-6">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-blue-400">
          <Mail className="w-6 h-6" />
        </div>

        <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
          {t('home.newsletterTitle')}
        </h2>

        <p className="text-slate-300 text-sm max-w-md mx-auto">{t('home.newsletterBody')}</p>

        <form
          className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="sr-only" htmlFor="newsletter-email">
            {t('home.newsletterEmail')}
          </label>
          <input
            id="newsletter-email"
            type="email"
            disabled
            placeholder={t('home.newsletterEmail')}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-400 outline-none disabled:cursor-not-allowed"
          />
          <Button
            type="submit"
            disabled
            className="bg-white text-slate-950 hover:bg-slate-100 font-bold h-12 px-6 disabled:cursor-not-allowed"
          >
            {t('home.newsletterComingSoon')}
          </Button>
        </form>

        <p className="text-[11px] text-slate-500">{t('home.newsletterUnavailable')}</p>
      </div>
    </section>
  );
};
