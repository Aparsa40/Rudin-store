import React from 'react';
import { AlertCircle, PackageSearch, RefreshCw } from 'lucide-react';

/**
 * Shared loading, empty, and error states for homepage data sections.
 * Every state is honest: errors surface with a retry, and empty
 * states never invent content.
 */

export const SectionSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div
    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
    aria-busy="true"
    data-testid="section-loading"
  >
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-pulse"
      >
        <div className="aspect-square bg-slate-100" />
        <div className="p-4 space-y-2.5">
          <div className="h-3 w-1/3 bg-slate-100 rounded" />
          <div className="h-3.5 w-3/4 bg-slate-100 rounded" />
          <div className="h-3.5 w-1/2 bg-slate-100 rounded" />
        </div>
      </div>
    ))}
  </div>
);

interface ErrorStateProps {
  message: string;
  retryLabel: string;
  onRetry?: () => void;
}

export const SectionError: React.FC<ErrorStateProps> = ({ message, retryLabel, onRetry }) => (
  <div
    className="border border-rose-200 bg-rose-50 rounded-2xl p-6 flex flex-col items-center gap-3 text-center"
    role="alert"
    data-testid="section-error"
  >
    <AlertCircle className="w-8 h-8 text-rose-500" />
    <p className="text-sm font-semibold text-rose-700">{message}</p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        {retryLabel}
      </button>
    )}
  </div>
);

interface EmptyStateProps {
  title: string;
  body: string;
}

export const SectionEmpty: React.FC<EmptyStateProps> = ({ title, body }) => (
  <div
    className="border border-slate-200 bg-slate-50 rounded-2xl p-8 flex flex-col items-center gap-2 text-center"
    data-testid="section-empty"
  >
    <PackageSearch className="w-8 h-8 text-slate-300" />
    <p className="text-sm font-bold text-slate-700">{title}</p>
    <p className="text-xs text-slate-500">{body}</p>
  </div>
);
