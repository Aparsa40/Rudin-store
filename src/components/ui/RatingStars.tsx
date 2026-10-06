import React from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  reviewCount?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  className?: string;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  reviewCount,
  size = 'md',
  showCount = true,
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFull = star <= Math.round(rating);
          return (
            <Star
              key={star}
              className={`${iconSizes[size]} ${
                isFull ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-300'
              }`}
            />
          );
        })}
      </div>
      {showCount && (
        <span className={`font-semibold text-slate-900 ${textSizes[size]}`}>
          {rating.toFixed(1)}
          {reviewCount !== undefined && (
            <span className="text-slate-500 font-normal ml-1">
              ({reviewCount.toLocaleString()})
            </span>
          )}
        </span>
      )}
    </div>
  );
};
