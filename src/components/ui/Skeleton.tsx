import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rectangular' }) => {
  const baseClasses = 'animate-pulse bg-gray-200';
  const variantClasses = {
    text: 'h-4 w-full rounded',
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />
  );
};

export const ListingSkeleton = () => (
  <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 h-full">
    <Skeleton className="aspect-[4/3] w-full" />
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-start">
        <Skeleton variant="text" className="w-2/3 h-6" />
        <Skeleton variant="text" className="w-1/4 h-6" />
      </div>
      <Skeleton variant="text" className="w-1/2 h-4" />
      <div className="pt-2 flex justify-between items-center">
        <Skeleton variant="text" className="w-1/3 h-4" />
        <Skeleton variant="circular" className="w-8 h-8" />
      </div>
    </div>
  </div>
);
