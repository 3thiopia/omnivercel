import { useState, useEffect, useCallback } from 'react';
import { Package, Trash2, ExternalLink, CheckCircle2, RefreshCw, AlertCircle, Edit3, User, Heart, Star, MessageSquare, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { Listing, Review } from '../types';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';
import { getOptimizedImageUrl } from '../lib/imageUtils';
import { LazyImage } from './LazyImage';
import { PostAdModal } from './PostAdModal';
import { ListingCard } from './ListingCard';
import { ConfirmationModal } from './ConfirmationModal';

interface MyListingsProps {
  onBack: () => void;
  onViewProduct: (listing: Listing) => void;
  onEditProfile: () => void;
}

export const MyListings = ({ onBack, onViewProduct, onEditProfile }: MyListingsProps) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'my-items' | 'favorites' | 'reviews'>('my-items');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [isDeletingListing, setIsDeletingListing] = useState<string | number | null>(null);

  const fetchMyListings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setError('You must be logged in to view your listings.');
        return;
      }

      const data = await api.listings.getAll({ 
        seller_id: session.user.id,
        status: 'all' // Fetch all statuses (active, sold, etc.)
      });
      setListings(data);
    } catch (err) {
      console.error('Error fetching my listings:', err);
      setError('Failed to load your listings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchFavorites = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setError('You must be logged in to view your favorites.');
        return;
      }

      const data = await api.listings.getFavorites(session.access_token);
      setFavorites(data);
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setError('Failed to load your favorites. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setError('You must be logged in to view your reviews.');
        return;
      }

      const data = await api.reviews.getForSeller(session.user.id);
      setReviews(data);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to load your reviews. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLikeReview = async (reviewId: string, currentLiked: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await api.reviews.update(reviewId, { seller_liked: !currentLiked }, session.access_token);
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, seller_liked: !currentLiked } : r));
      toast.success(!currentLiked ? 'Review liked!' : 'Review unliked');
    } catch (err) {
      console.error('Error liking review:', err);
      toast.error('Failed to update review');
    }
  };

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const handleReplySubmit = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setIsSubmittingReply(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const now = new Date().toISOString();
      await api.reviews.update(reviewId, { 
        seller_reply: replyText,
        replied_at: now
      }, session.access_token);

      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, seller_reply: replyText, replied_at: now } : r));
      toast.success('Reply posted!');
      setReplyingTo(null);
      setReplyText('');
    } catch (err) {
      console.error('Error replying to review:', err);
      toast.error('Failed to post reply');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'my-items') {
      fetchMyListings();
    } else if (activeSubTab === 'favorites') {
      fetchFavorites();
    } else {
      fetchReviews();
    }
  }, [activeSubTab, fetchMyListings, fetchFavorites, fetchReviews]);

  const handleToggleFavorite = async (listingId: string | number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      await api.listings.toggleFavorite(listingId, session.access_token);
      
      // If we are in favorites tab, remove it from the list
      if (activeSubTab === 'favorites') {
        setFavorites(prev => prev.filter(l => l.id !== listingId));
      } else {
        // Update the listing in the my-items list if it exists there
        setListings(prev => prev.map(l => l.id === listingId ? { ...l, isFavorited: !l.isFavorited } : l));
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleStatusUpdate = async (id: string | number, newStatus: 'active' | 'sold') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await api.listings.update(id, { status: newStatus }, session.access_token);
      
      // Update local state
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status. Please try again.');
    }
  };

  const handleDelete = async (id: string | number) => {
    setIsDeletingListing(id);
  };

  const confirmDelete = async () => {
    if (!isDeletingListing) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await api.listings.delete(isDeletingListing, session.access_token);
      setListings(prev => prev.filter(l => l.id !== isDeletingListing));
      setIsDeletingListing(null);
    } catch (err) {
      console.error('Error deleting listing:', err);
      toast.error('Failed to delete listing. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Loading your items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 px-4">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Oops!</h3>
        <p className="text-gray-500 mb-6">{error}</p>
        <button 
          onClick={activeSubTab === 'my-items' ? fetchMyListings : fetchFavorites}
          className="bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-600 transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">My Items</h2>
          <p className="text-gray-500 text-sm font-medium">Manage your listed products</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onEditProfile}
            className="flex items-center gap-2 bg-gray-50 text-gray-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all"
          >
            <User className="w-4 h-4" />
            Edit Profile
          </button>
          <button 
            onClick={activeSubTab === 'my-items' ? fetchMyListings : fetchFavorites}
            className="p-2 text-gray-400 hover:text-emerald-500 transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
        <button
          onClick={() => setActiveSubTab('my-items')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${activeSubTab === 'my-items' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Package className="w-4 h-4" />
          My Items
        </button>
        <button
          onClick={() => setActiveSubTab('favorites')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${activeSubTab === 'favorites' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Heart className="w-4 h-4" />
          My Favourites
        </button>
        <button
          onClick={() => setActiveSubTab('reviews')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${activeSubTab === 'reviews' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Star className="w-4 h-4" />
          My Reviews
        </button>
      </div>

      {activeSubTab === 'my-items' ? (
        listings.length === 0 ? (
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-12 text-center space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto">
              <Package className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No items yet</h3>
            <p className="text-gray-500 max-w-xs mx-auto">You haven't listed any items for sale yet. Start selling today!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence mode="popLayout">
              {listings.map((listing) => (
                <motion.div 
                  key={listing.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-4 flex gap-4"
                >
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 relative">
                    <LazyImage 
                      src={getOptimizedImageUrl(listing.image, { width: 300, height: 300 })} 
                      alt={listing.title} 
                      className="w-full h-full object-cover"
                    />
                    {listing.status === 'sold' && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-red-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded-md">Sold</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-gray-900 truncate text-base sm:text-lg">{listing.title}</h3>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase flex-shrink-0 ${listing.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-500'}`}>
                          {listing.status}
                        </span>
                      </div>
                      <p className="text-emerald-600 font-black text-lg">Br{listing.price.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-1">{listing.location}</p>
                    </div>

                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      {listing.status === 'active' ? (
                        <button 
                          onClick={() => handleStatusUpdate(listing.id, 'sold')}
                          className="bg-emerald-50 text-emerald-600 px-3 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-100 transition-all active:scale-95 flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark Sold
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleStatusUpdate(listing.id, 'active')}
                          className="bg-gray-50 text-gray-600 px-3 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-gray-100 transition-all active:scale-95 flex items-center justify-center gap-1"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Make Active
                        </button>
                      )}
                      
                      <button 
                        onClick={() => setEditingListing(listing)}
                        className="bg-gray-50 text-gray-600 px-3 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-gray-100 transition-all active:scale-95 flex items-center justify-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      
                      <button 
                        onClick={() => handleDelete(listing.id)}
                        className="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-red-100 transition-all active:scale-95 flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                      
                      <button 
                        onClick={() => onViewProduct(listing)}
                        className="p-2 text-gray-400 hover:text-blue-500 transition-all ml-auto"
                        title="View Listing"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )
      ) : activeSubTab === 'favorites' ? (
        favorites.length === 0 ? (
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-12 text-center space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto">
              <Heart className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No favourites yet</h3>
            <p className="text-gray-500 max-w-xs mx-auto">Items you heart will appear here. Start browsing!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {favorites.map((listing) => (
                <ListingCard 
                  key={listing.id}
                  title={listing.title}
                  price={listing.price}
                  location={listing.location}
                  image={listing.image}
                  category={listing.category}
                  categoryIcon={listing.categoryIcon}
                  isPromoted={listing.isPromoted}
                  isFavorited={true}
                  viewMode="grid"
                  onClick={() => onViewProduct(listing)}
                  onFavorite={() => handleToggleFavorite(listing.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )
      ) : (
        reviews.length === 0 ? (
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-12 text-center space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto">
              <Star className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No reviews yet</h3>
            <p className="text-gray-500 max-w-xs mx-auto">Feedback from your buyers will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence mode="popLayout">
              {reviews.map((review) => (
                <motion.div 
                  key={review.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                        {review.reviewer?.avatar_url ? (
                          <img 
                            src={getOptimizedImageUrl(review.reviewer.avatar_url, { width: 100, height: 100 })} 
                            alt={review.reviewer.full_name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{review.reviewer?.full_name}</h4>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                          {review.listing && (
                            <>
                              <span className="text-[10px] text-gray-200">•</span>
                              <div className="flex items-center gap-1.5 group cursor-pointer">
                                <div className="w-4 h-4 rounded-md overflow-hidden bg-gray-50 border border-gray-100">
                                  <img 
                                    src={getOptimizedImageUrl(review.listing.thumbnail_url || '', { width: 40, height: 40 })} 
                                    alt={review.listing.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <span className="text-[10px] text-gray-500 font-bold truncate max-w-[100px] group-hover:text-emerald-600 transition-colors">
                                  {review.listing.title}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} 
                        />
                      ))}
                    </div>
                  </div>
                  
                  {review.comment && (
                    <div className="bg-gray-50 rounded-xl p-4 relative">
                      <MessageSquare className="w-4 h-4 text-gray-200 absolute top-2 right-2" />
                      <p className="text-sm text-gray-600 font-medium leading-relaxed italic">
                        "{review.comment}"
                      </p>
                    </div>
                  )}

                  {review.seller_reply && (
                    <div className="ml-8 bg-emerald-50/50 border-l-4 border-emerald-500 rounded-r-xl p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center">
                          <User className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Your Reply</span>
                        <span className="text-[10px] text-emerald-400 font-medium ml-auto">
                          {review.replied_at ? new Date(review.replied_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <p className="text-sm text-emerald-800 font-medium leading-relaxed">
                        {review.seller_reply}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 pt-2">
                    <button 
                      onClick={() => handleLikeReview(review.id, !!review.seller_liked)}
                      className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                        review.seller_liked ? 'text-emerald-600' : 'text-gray-400 hover:text-emerald-500'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${review.seller_liked ? 'fill-emerald-600' : ''}`} />
                      {review.seller_liked ? 'Liked' : 'Like Review'}
                    </button>
                    
                    {!review.seller_reply && replyingTo !== review.id && (
                      <button 
                        onClick={() => {
                          setReplyingTo(review.id);
                          setReplyText('');
                        }}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-emerald-500 transition-all"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Reply
                      </button>
                    )}
                  </div>

                  {replyingTo === review.id && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3 pt-2"
                    >
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write your reply..."
                        className="w-full bg-gray-50 border-none rounded-xl p-4 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-emerald-500/20 outline-none min-h-[100px] resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setReplyingTo(null)}
                          className="px-4 py-2 rounded-xl text-[10px] font-black uppercase text-gray-400 hover:bg-gray-100 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReplySubmit(review.id)}
                          disabled={isSubmittingReply || !replyText.trim()}
                          className="bg-emerald-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
                        >
                          {isSubmittingReply ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Post Reply'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )
      )}

      <PostAdModal 
        isOpen={!!editingListing}
        onClose={() => setEditingListing(null)}
        onSuccess={() => {
          fetchMyListings();
          setEditingListing(null);
        }}
        editListing={editingListing || undefined}
      />

      <ConfirmationModal
        isOpen={!!isDeletingListing}
        onClose={() => setIsDeletingListing(null)}
        onConfirm={confirmDelete}
        title="Delete Listing"
        message="Are you sure you want to delete this listing? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};
