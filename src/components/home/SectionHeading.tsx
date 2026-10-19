import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  viewAllLabel?: string;
  viewAllTo?: string;
}

/**
 * Shared section header for homepage sections: eyebrow, title, optional
 * subtitle, and an optional "view all" link. Direction-aware: the
 * forward arrow flips and slides the correct way in RTL.
 */
export const SectionHeading: React.FC<SectionHeadingProps> = ({
  eyebrow,
  title,
  subtitle,
  viewAllLabel,
  viewAllTo,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
      <div>
        <span className="text-xs font-bold tracking-wider text-blue-600 uppercase">{eyebrow}</span>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{title}</h2>
        {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {viewAllLabel && viewAllTo && (
        <Link
          to={viewAllTo}
          className="text-xs font-bold text-slate-900 hover:text-blue-600 flex items-center gap-1 group"
        >
          {viewAllLabel}
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1 transition-transform" />
        </Link>
      )}
    </div>
  );
};
