import React, { useRef, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { useClickOutside } from '../../hooks/useClickOutside';

/**
 * Notifications entry. The notification service does not exist yet, so
 * the dropdown shows an honest empty state. No notification count is
 * ever fabricated or displayed.
 */
export const NotificationsMenu: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setIsOpen(false), isOpen);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={t('header.notifications')}
        title={t('header.notifications')}
        className="relative p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <Bell className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute end-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-6 z-50 text-center">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <BellOff className="w-5 h-5" />
          </div>
          <p className="text-sm font-bold text-slate-900">
            {t('header.notificationsEmptyTitle')}
          </p>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            {t('header.notificationsEmptyBody')}
          </p>
        </div>
      )}
    </div>
  );
};
