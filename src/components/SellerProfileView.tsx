import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, MapPin, Calendar, Star, Package, Loader2, MessageCircle } from 'lucide-react';
import { api, Listing, UserProfile } from '../services/api';
import { ListingCard } from './ListingCard';
import { getOptimizedImageUrl } from '../lib/imageUtils';

interface SellerProfileViewProps {
  sellerId: string;
  onBack: () => void;
  onOpenListing: (id: string | number) => void;
  onContact: (sellerId: string) => void;
}

export function SellerProfileView({ sellerId, onBack, onOpenListing, onContact }: SellerProfileViewProps) {
  const [seller, setSeller] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSellerData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [profileData, listingsData] = await Promise.all([
          api.users.getById(sellerId),
          api.listings.getAll({ seller_id: sellerId, status: 'active' })
        ]);
        setSeller(profileData);
        setListings(listingsData);
      } catch (err) {
        console.error('Error fetching seller data:', err);
        setError('Failed to load seller profile. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSellerData();
  }, [sellerId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-gray-500 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !seller) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
        <p className="text-gray-500 mb-6 max-w-xs">{error || "This seller's profile is no longer available."}</p>
        <button
          onClick={onBack}
          className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Seller Profile</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 border border-gray-100 shadow-sm relative overflow-hidden">
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
          
          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative group">
              <img
                src={seller.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.full_name)}&background=10b981&color=fff&size=128`}
                alt={seller.full_name}
                className="w-24 h-24 sm:w-32 sm:w-32 rounded-[2rem] object-cover ring-4 ring-emerald-50 shadow-lg"
              />
              {seller.status === 'active' && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full shadow-sm" />
              )}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{seller.full_name}</h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full text-xs font-bold text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    {seller.location || 'Ethiopia'}
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full text-xs font-bold text-gray-600">
                    <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                    Joined {new Date(seller.created_at || Date.now()).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-6 py-2 border-y border-gray-50">
                <div className="text-center sm:text-left">
                  <p className="text-sm font-black text-gray-900">{listings.length}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Listings</p>
                </div>
                <div className="w-[1px] h-8 bg-gray-100" />
                <div className="text-center sm:text-left">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-black text-gray-900">4.8</p>
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rating</p>
                </div>
              </div>

              <button
                onClick={() => onContact(seller.id)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                Contact Seller
              </button>
            </div>
          </div>
        </div>

        {/* Listings Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Seller's Listings</h3>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">
              {listings.length} items
            </span>
          </div>

          {listings.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  title={listing.title}
                  price={listing.price}
                  location={listing.location}
                  image={listing.image}
                  category={listing.category_data?.name || listing.category}
                  categoryIcon={listing.category_data?.icon || listing.categoryIcon}
                  isPromoted={listing.isPromoted}
                  isFavorited={listing.isFavorited}
                  likesCount={listing.likes_count}
                  postedAt={listing.postedAt}
                  onClick={() => onOpenListing(listing.id)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] p-12 text-center border border-gray-100">
              <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <h4 className="text-lg font-bold text-gray-900">No active listings</h4>
              <p className="text-gray-500 text-sm">This seller doesn't have any public listings at the moment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
