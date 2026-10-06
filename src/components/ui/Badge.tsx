import React from 'react';

interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'purple' | 'outline';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'secondary',
  size = 'md',
  children,
  className = '',
}) => {
  const variantStyles = {
    primary: 'bg-slate-900 text-white',
    secondary: 'bg-slate-100 text-slate-800',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200',
    outline: 'border border-slate-300 text-slate-700 bg-white',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 rounded-full font-semibold',
    md: 'text-xs px-2.5 py-1 rounded-md font-medium',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 leading-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
