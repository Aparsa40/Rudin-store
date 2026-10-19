import React, { useRef, useState } from 'react';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { useTranslation, LANGUAGE_META, SUPPORTED_LANGUAGES } from '../../i18n';
import { useClickOutside } from '../../hooks/useClickOutside';

/**
 * Visible language selector offering every supported language
 * (English, فارسی). The active language is marked with a check and
 * announced to screen readers via `aria-current`.
 */
export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setIsOpen(false), isOpen);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t('header.changeLanguage')}
        title={t('header.changeLanguage')}
        className="flex items-center gap-1.5 p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <Languages className="w-5 h-5" />
        <span className="hidden sm:inline text-xs font-bold">
          {LANGUAGE_META[language].label}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label={t('header.languageLabel')}
          className="absolute end-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50"
        >
          {SUPPORTED_LANGUAGES.map((option) => {
            const isActive = option === language;
            return (
              <li key={option} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  lang={option}
                  dir={LANGUAGE_META[option].direction}
                  onClick={() => {
                    setLanguage(option);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? 'font-bold text-blue-700 bg-blue-50'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>{LANGUAGE_META[option].label}</span>
                  {isActive && <Check className="w-4 h-4" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
