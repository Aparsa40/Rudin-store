/**
 * Configuration-driven homepage content.
 *
 * The backend has no campaign or banner management API yet. Slides,
 * the announcement bar, and the mid-page banner therefore come from
 * this clearly documented configuration file rather than an invented
 * production API. When a real campaign service exists, this module
 * can be replaced by a service without touching the components.
 */

export interface BilingualText {
  en: string;
  fa: string;
}

export interface HeroSlide {
  id: string;
  eyebrow: BilingualText;
  title: BilingualText;
  description: BilingualText;
  ctaLabel: BilingualText;
  /** Internal application route; must exist in the router. */
  ctaHref: string;
  /** Tailwind gradient classes that give the slide its visual identity. */
  gradient: string;
  /** Optional existing in-repo asset (never an external URL). */
  assetSrc?: string;
  assetAlt?: BilingualText;
}

export interface AnnouncementConfig {
  enabled: boolean;
  badge: BilingualText;
  message: BilingualText;
}

export interface MidPageBannerConfig {
  enabled: boolean;
  title: BilingualText;
  body: BilingualText;
  ctaLabel: BilingualText;
  ctaHref: string;
  gradient: string;
}

/** Routes the homepage configuration may link to. All are wired in App.tsx. */
export const KNOWN_HOMEPAGE_LINKS: readonly string[] = [
  '/',
  '/shop',
  '/cart',
  '/checkout',
  '/login',
  '/register',
  '/account',
  '/vendors',
  '/seller/join',
  '/categories/electronics',
  '/categories/clothing',
  '/categories/home-living',
  '/categories/kitchen-coffee',
  '/categories/bags-accessories',
  '/categories/wellness-beauty',
];

export const HERO_CAROUSEL_DEFAULTS = {
  /** Automatic rotation interval in milliseconds. */
  intervalMs: 6000,
  autoplay: true,
} as const;

export const ANNOUNCEMENT: AnnouncementConfig = {
  enabled: true,
  badge: { en: 'Autumn Market', fa: 'بازار پاییزی' },
  message: {
    en: 'Use code RUDIN15 for 15% off independent creator collections.',
    fa: 'با کد RUDIN15 از تخفیف ۱۵٪ روی مجموعه‌های سازندگان مستقل بهره‌مند شوید.',
  },
};

export const HERO_SLIDES: readonly HeroSlide[] = [
  {
    id: 'independent-creators',
    eyebrow: {
      en: 'Independent Creator Marketplace',
      fa: 'بازارگاه سازندگان مستقل',
    },
    title: {
      en: 'Exceptional goods. Independent makers.',
      fa: 'کالاهای استثنایی، از سازندگان مستقل.',
    },
    description: {
      en: 'Connect directly with verified independent sound laboratories, heritage textile ateliers, and ceramic master craftspeople worldwide.',
      fa: 'مستقیماً با آزمایشگاه‌های صوت مستقل، کارگاه‌های نساجی اصیل و استادان سفالگر جهان در ارتباط باشید.',
    },
    ctaLabel: { en: 'Explore Catalog', fa: 'مشاهده کاتالوگ' },
    ctaHref: '/shop',
    gradient: 'from-slate-950 via-slate-900 to-indigo-950',
    assetSrc: '/branding/og-image.svg',
    assetAlt: { en: 'Rudin Store marketplace', fa: 'بازارگاه Rudin Store' },
  },
  {
    id: 'meet-the-makers',
    eyebrow: { en: 'Meet the Makers', fa: 'با سازندگان آشنا شوید' },
    title: {
      en: 'Shop directly from verified studios.',
      fa: 'مستقیماً از فروشگاه‌های تأییدشده خرید کنید.',
    },
    description: {
      en: 'Every store is individually audited. Discover the people behind the products and support independent businesses.',
      fa: 'هر فروشگاه به‌صورت جداگانه بررسی می‌شود. سازندگان پشت محصولات را کشف کنید و از کسب‌وکارهای مستقل حمایت کنید.',
    },
    ctaLabel: { en: 'Browse Stores', fa: 'مرور فروشگاه‌ها' },
    ctaHref: '/vendors',
    gradient: 'from-slate-900 via-slate-950 to-blue-950',
  },
  {
    id: 'autumn-market',
    eyebrow: { en: 'Autumn Market', fa: 'بازار پاییزی' },
    title: {
      en: '15% off creator collections.',
      fa: '۱۵٪ تخفیف روی مجموعه‌های سازندگان.',
    },
    description: {
      en: 'Use code RUDIN15 at checkout for 15% off selected independent collections this season.',
      fa: 'این فصل هنگام پرداخت از کد RUDIN15 برای ۱۵٪ تخفیف روی مجموعه‌های منتخب مستقل استفاده کنید.',
    },
    ctaLabel: { en: 'Shop the Sale', fa: 'خرید با تخفیف' },
    ctaHref: '/shop',
    gradient: 'from-indigo-950 via-slate-950 to-amber-950',
  },
];

export const MID_PAGE_BANNER: MidPageBannerConfig = {
  enabled: true,
  title: {
    en: 'Special Offers from Our Top Vendors',
    fa: 'پیشنهادهای ویژه از برترین فروشندگان',
  },
  body: {
    en: 'More brands, better prices, trusted sellers.',
    fa: 'برندهای بیشتر، قیمت‌های بهتر، فروشندگان قابل اعتماد.',
  },
  ctaLabel: { en: 'Explore Now', fa: 'مشاهده پیشنهادها' },
  ctaHref: '/vendors',
  gradient: 'from-slate-900 to-indigo-950',
};
