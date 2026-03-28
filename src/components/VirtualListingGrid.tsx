import React from 'react';
import { Virtuoso } from 'react-virtuoso';
import { ListingCard } from './ListingCard';
import { ListingSkeleton } from './ui/Skeleton';
import { ComponentErrorBoundary } from './ComponentErrorBoundary';

interface VirtualListingGridProps {
  listings: any[];
  columns: number;
  viewMode: 'grid' | 'list';
  isFetchingNextPage: boolean;
  hasNextPage: boolean | undefined;
  fetchNextPage: () => void;
  handleOpenListing: (listing: any) => void;
  handleToggleFavorite: (id: string | number) => void;
}

export const VirtualListingGrid: React.FC<VirtualListingGridProps> = ({
  listings,
  columns,
  viewMode,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  handleOpenListing,
  handleToggleFavorite,
}) => {
  const rowCount = viewMode === 'list' 
    ? listings.length 
    : Math.ceil(listings.length / columns);

  const renderRow = (index: number) => {
    if (viewMode === 'list') {
      const listing = listings[index];
      if (!listing) return null;

      return (
        <div className="px-1 py-2">
          <ComponentErrorBoundary>
            <ListingCard 
              key={listing.id} 
              title={listing.title}
              price={listing.price}
              location={listing.location}
              image={listing.image}
              category={listing.category_data?.parent ? `${listing.category_data.parent.name} > ${listing.category_data.name}` : (listing.category_data?.name || listing.category)}
              categoryIcon={listing.category_data?.icon || listing.categoryIcon}
              isPromoted={listing.isPromoted}
              isFavorited={listing.isFavorited}
              likesCount={listing.likes_count}
              condition={listing.condition}
              is_ad={listing.is_ad}
              postedAt={listing.postedAt}
              viewMode={viewMode} 
              onClick={() => handleOpenListing(listing)}
              onFavorite={() => handleToggleFavorite(listing.id)}
            />
          </ComponentErrorBoundary>
        </div>
      );
    }

    // Grid mode
    const items = [];
    for (let i = 0; i < columns; i++) {
      const itemIndex = index * columns + i;
      const listing = listings[itemIndex];
      
      if (listing) {
        items.push(
          <div key={listing.id} className="flex-1 px-2">
            <ComponentErrorBoundary>
              <ListingCard 
                title={listing.title}
                price={listing.price}
                location={listing.location}
                image={listing.image}
                category={listing.category_data?.parent ? `${listing.category_data.parent.name} > ${listing.category_data.name}` : (listing.category_data?.name || listing.category)}
                categoryIcon={listing.category_data?.icon || listing.categoryIcon}
                isPromoted={listing.isPromoted}
                isFavorited={listing.isFavorited}
                likesCount={listing.likes_count}
                condition={listing.condition}
                is_ad={listing.is_ad}
                postedAt={listing.postedAt}
                viewMode={viewMode} 
                onClick={() => handleOpenListing(listing)}
                onFavorite={() => handleToggleFavorite(listing.id)}
              />
            </ComponentErrorBoundary>
          </div>
        );
      } else {
        items.push(<div key={`empty-${i}`} className="flex-1 px-2" />);
      }
    }

    return (
      <div className="flex py-2">
        {items}
      </div>
    );
  };

  return (
    <Virtuoso
      useWindowScroll
      totalCount={rowCount}
      itemContent={renderRow}
      endReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }}
      components={{
        Footer: () => isFetchingNextPage ? (
          <div className={`grid gap-3 sm:gap-4 py-4 ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'flex flex-col'}`}>
            {Array.from({ length: columns }).map((_, i) => (
              <ListingSkeleton key={i} />
            ))}
          </div>
        ) : null
      }}
    />
  );
};
