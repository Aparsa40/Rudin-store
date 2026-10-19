import React from 'react';
import { HeroCarousel } from '../components/home/HeroCarousel';
import { TrustStrip } from '../components/home/TrustStrip';
import { FlashDealsSection } from '../components/home/FlashDealsSection';
import { CategoryShortcuts } from '../components/home/CategoryShortcuts';
import { TopSellingSection } from '../components/home/TopSellingSection';
import { MidPageBanner } from '../components/home/MidPageBanner';
import { FeaturedCatalogTabs } from '../components/home/FeaturedCatalogTabs';
import { VendorSpotlight } from '../components/home/VendorSpotlight';
import { NewsletterSection } from '../components/home/NewsletterSection';

/**
 * Marketplace homepage, composed from focused, reusable section
 * components. Each data-driven section owns its own loading, empty,
 * and error states and pulls only from real application services.
 *
 * Section order follows the conceptual wireframe: hero carousel, trust
 * strip, flash deals, category shortcuts, top sellers, mid-page
 * banner, featured catalog tabs, vendor spotlight, newsletter.
 */
export const Home: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <HeroCarousel />
      <TrustStrip />
      <FlashDealsSection />
      <CategoryShortcuts />
      <TopSellingSection />
      <MidPageBanner />
      <FeaturedCatalogTabs />
      <VendorSpotlight />
      <NewsletterSection />
    </div>
  );
};
