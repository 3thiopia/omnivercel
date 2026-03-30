import React, { Key } from 'react';
import { Heart, MapPin, ShieldCheck, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

import { getOptimizedImageUrl } from '../lib/imageUtils';
import { LazyImage } from './LazyImage';

interface ListingCardProps {
  title: string;
  price: number;
  location: string;
  image: string;
  category?: string;
  categoryIcon?: string;
  isPromoted?: boolean;
  isFavorited?: boolean;
  likesCount?: number;
  is_ad?: boolean;
  postedAt?: string;
  condition?: string;
  viewMode?: 'grid' | 'list';
  key?: Key;
  onClick?: () => void;
  onFavorite?: (e: React.MouseEvent) => void;
}

export const ListingCard = React.memo(({ title, price, location, image, category, categoryIcon, isPromoted, isFavorited, likesCount, is_ad, postedAt, condition, viewMode = 'grid', onClick, onFavorite }: ListingCardProps) => {
  const optimizedImage = React.useMemo(() => getOptimizedImageUrl(image, { 
    width: viewMode === 'grid' ? 300 : 200,
    height: viewMode === 'grid' ? 225 : 150
  }), [image, viewMode]);

  const timeAgo = React.useMemo(() => {
    if (!postedAt) return null;
    try {
      return formatDistanceToNow(new Date(postedAt), { addSuffix: true });
    } catch (e) {
      return null;
    }
  }, [postedAt]);

  if (viewMode === 'grid') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        onClick={onClick}
        className={`bg-white rounded-2xl overflow-hidden border ${isPromoted ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'border-gray-100/50 shadow-sm'} hover:shadow-xl transition-all group cursor-pointer relative h-full flex flex-col`}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <LazyImage 
            src={optimizedImage} 
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          {isPromoted && (
            <div className="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              TOP
            </div>
          )}
          {is_ad && (
            <div className="absolute top-3 right-3 bg-gray-900/80 backdrop-blur-sm text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter z-10">
              Ad
            </div>
          )}
        </div>
        <div className="p-2 sm:p-4 flex flex-col flex-1 min-h-0">
          <div className="h-[12px] sm:h-[16px] mb-0.5 sm:mb-1 overflow-hidden">
            {category && (
              <div className="flex items-center gap-1 text-[8px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                <span>{categoryIcon}</span>
                <span className="truncate">{category}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between items-start gap-2 mb-0.5 sm:mb-2">
            <h3 className="font-bold text-gray-800 text-xs sm:text-base line-clamp-2 break-all h-[1.8rem] sm:h-[2.4rem] overflow-hidden group-hover:text-emerald-600 transition-colors leading-[1.2] flex-1 min-w-0 m-0 p-0">
              {title}
            </h3>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onFavorite?.(e);
              }}
              className={`flex items-center gap-1 transition-all ${isFavorited ? 'text-red-500' : 'text-gray-300 hover:text-red-500'}`}
            >
              {likesCount !== undefined && likesCount > 0 && (
                <span className="text-[10px] font-black">{likesCount}</span>
              )}
              <Heart className={`w-4 h-4 sm:w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
            </button>
          </div>
          <div className="flex flex-col gap-0.5 sm:gap-1 mt-1 sm:mt-2">
            <span className="text-sm sm:text-xl font-black text-emerald-600">
              Br {price.toLocaleString()}
            </span>
            <div className="flex items-center gap-1 text-gray-400 text-[9px] sm:text-xs mt-0 sm:mt-0.5">
              <MapPin className="w-2.5 h-2.5 sm:w-3 h-3 shrink-0" />
              <span className="truncate">{location}</span>
            </div>
            <div className="mt-0.5">
              {timeAgo && (
                <div className="flex items-center gap-1 text-gray-400 text-[8px] sm:text-[10px]">
                  <Clock className="w-2 h-2 sm:w-2.5 h-2.5 shrink-0" />
                  <span>{timeAgo}</span>
                </div>
              )}
            </div>
            <div className="mt-0.5 sm:mt-1">
              {condition && (
                <span className="text-[8px] sm:text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider inline-block">
                  {condition}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      onClick={onClick}
      className={`bg-white rounded-2xl overflow-hidden border ${isPromoted ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'border-gray-100/50 shadow-sm'} hover:shadow-md transition-all group cursor-pointer flex h-36 sm:h-40`}
    >
      <div className="relative w-32 sm:w-48 overflow-hidden flex-shrink-0">
        <LazyImage 
          src={optimizedImage} 
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        {isPromoted && (
          <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
            <ShieldCheck className="w-2 h-2" />
            TOP
          </div>
        )}
        {is_ad && (
          <div className="absolute top-2 right-2 bg-gray-900/80 backdrop-blur-sm text-white text-[7px] font-black px-1 py-0.5 rounded uppercase tracking-tighter z-10">
            Ad
          </div>
        )}
      </div>
      <div className="p-3 sm:p-4 flex flex-col gap-2 flex-1 min-w-0">
        <div>
          {category && (
            <div className="flex items-center gap-1 text-[8px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5 sm:mb-1">
              <span>{categoryIcon}</span>
              <span className="truncate">{category}</span>
            </div>
          )}
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-bold text-gray-800 text-sm sm:text-lg line-clamp-1 break-all group-hover:text-emerald-600 transition-colors flex-1">
              {title}
            </h3>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onFavorite?.(e);
              }}
              className={`flex items-center gap-1 transition-all ${isFavorited ? 'text-red-500' : 'text-gray-300 hover:text-red-500'}`}
            >
              {likesCount !== undefined && likesCount > 0 && (
                <span className="text-[10px] sm:text-xs font-black">{likesCount}</span>
              )}
              <Heart className={`w-4 h-4 sm:w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 sm:mt-2">
            <div className="flex items-center gap-1 text-gray-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">
              <MapPin className="w-2.5 h-2.5 sm:w-3 h-3" />
              <span className="truncate max-w-[80px] sm:max-w-none">{location}</span>
            </div>
            {timeAgo && (
              <div className="flex items-center gap-1 text-gray-400 text-[8px] sm:text-[9px] font-medium">
                <Clock className="w-2 h-2 sm:w-2.5 h-2.5" />
                <span>{timeAgo}</span>
              </div>
            )}
          </div>
          {condition && (
            <div className="mt-1.5">
              <span className="text-[8px] sm:text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                {condition}
              </span>
            </div>
          )}
        </div>
        <div className="flex justify-between items-end mt-auto">
          <span className="text-base sm:text-xl font-black text-emerald-600">
            Br {price.toLocaleString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
});
