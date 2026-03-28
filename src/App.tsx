import { useState, useEffect, FormEvent, lazy, Suspense, useMemo, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, useParams, Link } from 'react-router-dom';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { CategoryBar } from './components/CategoryBar';
import { ListingCard } from './components/ListingCard';
import { PostAdModal } from './components/PostAdModal';
import { AuthModal } from './components/AuthModal';
import { BottomNav } from './components/BottomNav';
import { ConfirmationModal } from './components/ConfirmationModal';
import { api, Listing, UserProfile } from './services/api';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { ETHIOPIAN_LOCATIONS } from './constants/locations';
import { ShieldCheck, Search, PlusCircle, LayoutGrid, List, Settings, LogOut, User, Home, Package, MessageCircle, Filter, ArrowUpDown, X, MapPin, Loader2, RefreshCw, CheckCircle2, RotateCcw } from 'lucide-react';
import { supabase } from './lib/supabase';
import { getOptimizedImageUrl } from './lib/imageUtils';
import { ProfileCompletionModal } from './components/ProfileCompletionModal';
import { VirtualListingGrid } from './components/VirtualListingGrid';
import { ListingSkeleton } from './components/ui/Skeleton';
import { Meta } from './components/Meta';
import { useAnalytics } from './hooks/useAnalytics';

import { getProductSlug, getIdFromSlug } from './lib/seoUtils';

// Lazy load heavy components
const ProductDetail = lazy(() => import('./components/ProductDetail').then(m => ({ default: m.ProductDetail })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const MyListings = lazy(() => import('./components/MyListings').then(m => ({ default: m.MyListings })));
const ProfileView = lazy(() => import('./components/ProfileView').then(m => ({ default: m.ProfileView })));
const ChatView = lazy(() => import('./components/ChatView').then(m => ({ default: m.ChatView })));
const StaticPage = lazy(() => import('./components/StaticPage').then(m => ({ default: m.StaticPage })));
const SellerProfileView = lazy(() => import('./components/SellerProfileView').then(m => ({ default: m.SellerProfileView })));

function ListingDetailWrapper({ onOpenListing, onStartChat, setEditingListing, setIsPostAdOpen, handleDeleteListing, handleToggleFavorite, handleViewSellerProfile }: any) {
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListing = async () => {
      const listingId = id || (slug ? getIdFromSlug(slug) : null);
      if (!listingId) return;
      
      setLoading(true);
      try {
        const data = await api.listings.getById(listingId);
        setListing(data);
        
        // If accessed via old ID URL, redirect to SEO URL
        if (id && data) {
          const newSlug = getProductSlug(data.title, data.id);
          navigate(`/product/${newSlug}`, { replace: true });
        }
      } catch (err) {
        console.error('Error fetching listing:', err);
        toast.error('Listing not found');
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [id, slug]);

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
      <p className="text-gray-500 font-medium animate-pulse">Loading listing...</p>
    </div>
  );
  if (!listing) return <Navigate to="/" />;

  return (
    <>
      <Meta 
        title={listing.title}
        description={listing.description}
        image={listing.image}
        type="product"
      />
      <ProductDetail 
        product={listing} 
      onBack={() => navigate(-1)}
      onViewProduct={(l) => onOpenListing(l)}
      onStartChat={onStartChat}
      onEdit={() => {
        setEditingListing(listing);
        setIsPostAdOpen(true);
      }}
      onDelete={() => handleDeleteListing(listing.id)}
      onFavorite={async () => {
        const favorited = await handleToggleFavorite(listing.id);
        if (favorited !== null) {
          setListing({
            ...listing,
            isFavorited: favorited,
            likes_count: (listing.likes_count || 0) + (favorited ? 1 : -1)
          });
        }
      }}
      onViewSellerProfile={handleViewSellerProfile}
    />
    </>
  );
}

function SellerProfileWrapper({ handleOpenListing, handleStartChat }: any) {
  const { id } = useParams();
  const navigate = useNavigate();
  if (!id) return <Navigate to="/" />;
  return (
    <SellerProfileView 
      sellerId={id} 
      onBack={() => navigate(-1)}
      onOpenListing={(listing) => handleOpenListing(listing)}
      onContact={(sid) => {
        handleStartChat(sid);
      }}
    />
  );
}

// Window size hook
function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

export default function App() {
  useAnalytics();
  const [isPostAdOpen, setIsPostAdOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'items' | 'sell' | 'profile' | 'messages'>('home');
  const [unreadCount, setUnreadCount] = useState(0);
  
  const queryClient = useQueryClient();
  const [pendingConversationId, setPendingConversationId] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'created_at' | 'price' | 'likes_count'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [regionFilter, setRegionFilter] = useState<string>('');
  const [subRegionFilter, setSubRegionFilter] = useState<string>('');
  const [isDeletingListing, setIsDeletingListing] = useState<string | number | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const { width } = useWindowSize();
  const navigate = useNavigate();
  const location = useLocation();

  // Sync activeTab with current path
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') setActiveTab('home');
    else if (path.startsWith('/items')) setActiveTab('items');
    else if (path.startsWith('/messages')) setActiveTab('messages');
    else if (path.startsWith('/profile')) setActiveTab('profile');
  }, [location.pathname]);

  const columns = useMemo(() => {
    if (width >= 1280) return 5; // xl:grid-cols-5
    if (width >= 1024) return 4; // lg:grid-cols-4
    if (width >= 640) return 3;  // sm:grid-cols-3
    return 2;                    // grid-cols-2
  }, [width]);

  const {
    data: listingsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isListingsLoading,
    refetch: refetchListings,
  } = useInfiniteQuery({
    queryKey: ['listings', selectedCategory, searchQuery, sortBy, sortOrder, minPrice, maxPrice, locationFilter],
    queryFn: async ({ pageParam = 1 }) => {
      const { data: { session } } = await supabase.auth.getSession();
      return api.listings.getAll({ 
        search: searchQuery || undefined, 
        category: selectedCategory || undefined,
        sort: sortBy,
        order: sortOrder as 'asc' | 'desc',
        min_price: minPrice ? parseFloat(minPrice) : undefined,
        max_price: maxPrice ? parseFloat(maxPrice) : undefined,
        location: locationFilter || undefined,
        page: pageParam,
        limit: 20
      }, session?.access_token);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length + 1 : undefined;
    },
  });

  const listings = useMemo(() => {
    return listingsData?.pages.flat() || [];
  }, [listingsData]);

  const processedListings = useMemo(() => {
    if (viewMode === 'list') return listings;
    
    const regularListings = listings.filter(l => !l.is_ad);
    const ads = listings.filter(l => l.is_ad);
    
    if (ads.length === 0) return listings;
    
    const result = [...regularListings];
    // Sort ads by row then col to ensure consistent injection
    const sortedAds = [...ads].sort((a, b) => {
      const rowA = a.ad_row || 0;
      const rowB = b.ad_row || 0;
      const colA = a.ad_col || 0;
      const colB = b.ad_col || 0;
      if (rowA !== rowB) return rowA - rowB;
      return colA - colB;
    });
    
    sortedAds.forEach(ad => {
      if (ad.ad_row && ad.ad_col) {
        const index = (ad.ad_row - 1) * columns + (ad.ad_col - 1);
        if (index >= 0 && index <= result.length) {
          result.splice(index, 0, ad);
        }
      }
    });
    
    return result;
  }, [listings, columns, viewMode]);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser({ ...session.user, token: session.access_token });
        fetchUserProfile(session.access_token);
      } else {
        setUser(null);
        setUserProfile(null);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser({ ...session.user, token: session.access_token });
        fetchUserProfile(session.access_token);
      } else {
        setUser(null);
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (token: string) => {
    try {
      const profile = await api.users.getMe(token);
      setUserProfile(profile);
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const { count } = await api.chats.getUnreadCount(session.access_token);
        setUnreadCount(count);
      } else {
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
  }, [user]);

  // Refresh unread count when switching to messages tab
  useEffect(() => {
    if (activeTab === 'messages') {
      fetchUnreadCount();
    }
  }, [activeTab]);

  // Update location filter when region or sub-region changes
  useEffect(() => {
    if (subRegionFilter) {
      setLocationFilter(subRegionFilter);
    } else if (regionFilter) {
      setLocationFilter(regionFilter);
    } else {
      setLocationFilter('');
    }
  }, [regionFilter, subRegionFilter]);

  const handleOpenListing = useCallback(async (listing: Listing) => {
    const slug = getProductSlug(listing.title, listing.id);
    navigate(`/product/${slug}`);
  }, [navigate]);

  const handleViewSellerProfile = (sellerId: string) => {
    navigate(`/seller/${sellerId}`);
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    queryClient.invalidateQueries({ queryKey: ['listings'] });
  };

  // Refetch when sorting, category, or user changes
  useEffect(() => {
    if (activeTab === 'home') {
      // When "Most Liked" is selected, default to descending order
      if (sortBy === 'likes_count' && sortOrder === 'asc') {
        setSortOrder('desc');
        return; // The next effect cycle will trigger refetchListings
      }
      refetchListings();
    }
  }, [selectedCategory, sortBy, sortOrder, user, activeTab]);

  const handleSellClick = () => {
    if (!user) {
      setIsAuthOpen(true);
    } else {
      setIsPhoneModalOpen(true);
    }
  };

  const handleToggleFavorite = async (listingId: string | number) => {
    if (!user) {
      setIsAuthOpen(true);
      return null;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return null;

      const { favorited } = await api.listings.toggleFavorite(listingId, session.access_token);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      return favorited;
    } catch (err) {
      console.error('Error toggling favorite:', err);
      return null;
    }
  };

  const handleDeleteListing = async (listingId: string | number) => {
    setIsDeletingListing(listingId);
  };

  const confirmDeleteListing = async () => {
    if (!isDeletingListing) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await api.listings.delete(isDeletingListing, session.access_token);
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      setIsDeletingListing(null);
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error('Failed to delete listing');
    }
  };

  useEffect(() => {
    const handleNavigation = (e: any) => {
      const { conversationId } = e.detail || {};
      if (conversationId) {
        setPendingConversationId(conversationId);
      }
      setActiveTab('messages');
    };

    window.addEventListener('navigate-to-chat', handleNavigation);
    window.addEventListener('refresh-unread-count', fetchUnreadCount);

    // Global real-time subscription for unread count
    const channel = supabase
      .channel('global-chat-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as any;
          // Only show notification if message is from someone else
          if (newMsg.sender_id !== user?.id) {
            fetchUnreadCount();
            
            // Show toast notification if not on messages tab
            if (activeTab !== 'messages') {
              toast('New message received!', {
                icon: '💬',
                position: 'top-right',
                duration: 4000,
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          fetchUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('navigate-to-chat', handleNavigation);
      window.removeEventListener('refresh-unread-count', fetchUnreadCount);
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const handleLogoutSuccess = () => {
    navigate('/');
  };

  const confirmLogout = async () => {
    await supabase.auth.signOut();
    handleLogoutSuccess();
    setIsLogoutModalOpen(false);
    toast.success('Logged out successfully');
  };

  const handleStartChat = (conversationId: string) => {
    setPendingConversationId(conversationId);
    navigate('/messages');
  };

  const isFullScreenPage = location.pathname.startsWith('/admin') || 
                         location.pathname.startsWith('/listing/') || 
                         location.pathname.startsWith('/seller/');

  return (
    <div className={`min-h-screen bg-gray-50 font-sans ${activeTab === 'messages' ? 'pb-0' : 'pb-20'} lg:pb-0`}>
      <Toaster position="top-right" />
      {!isFullScreenPage && (
        <nav className="hidden lg:block sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            {/* Logo */}
              <div 
                onClick={() => {
                  navigate('/');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex-shrink-0 flex items-center gap-2 cursor-pointer"
              >
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">O</span>
                </div>
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
                  Omni<span className="text-emerald-500">Market</span>
                </span>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center gap-8">
                <button 
                  onClick={() => {
                    navigate('/');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`flex items-center gap-2 font-bold transition-colors ${activeTab === 'home' ? 'text-emerald-500' : 'text-gray-500 hover:text-emerald-500'}`}
                >
                  <Home className="w-5 h-5" />
                  <span>Home</span>
                </button>
                <button 
                  onClick={() => {
                    if (!user) {
                      setIsAuthOpen(true);
                      return;
                    }
                    navigate('/items');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`flex items-center gap-2 font-bold transition-colors ${activeTab === 'items' ? 'text-emerald-500' : 'text-gray-500 hover:text-emerald-500'}`}
                >
                  <Package className="w-5 h-5" />
                  <span>My Items</span>
                </button>
                <button 
                  onClick={() => {
                    navigate('/messages');
                  }}
                  className={`flex items-center gap-2 font-bold transition-colors relative ${activeTab === 'messages' ? 'text-emerald-500' : 'text-gray-500 hover:text-emerald-500'}`}
                >
                  <div className="relative">
                    <MessageCircle className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <div className="absolute -top-2 -right-2">
                        <div className="relative">
                          <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-25"></div>
                          <div className="bg-red-500 text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-lg border-2 border-white leading-none">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <span>Chat</span>
                </button>
                <button 
                  onClick={() => {
                    if (!user) {
                      setIsAuthOpen(true);
                    } else {
                      navigate('/profile');
                    }
                  }}
                  className={`flex items-center gap-2 font-bold transition-colors ${activeTab === 'profile' ? 'text-emerald-500' : 'text-gray-500 hover:text-emerald-500'}`}
                >
                  <User className="w-5 h-5" />
                  <span>Account</span>
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 sm:gap-4">
                {userProfile?.role === 'admin' && (
                  <>
                    <button 
                      onClick={() => navigate('/admin')}
                      className="text-gray-400 hover:text-emerald-500 transition-colors flex items-center gap-1 font-medium text-xs sm:text-sm"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span className="hidden xs:inline">Admin</span>
                    </button>
                    <div className="h-6 w-[1px] bg-gray-200 hidden sm:block"></div>
                  </>
                )}
                
                {user ? (
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div 
                      onClick={() => navigate('/profile')}
                      className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center cursor-pointer hover:border-emerald-500 transition-all"
                      title={userProfile?.full_name || user.email}
                    >
                    {userProfile?.avatar_url ? (
                      <img 
                        src={getOptimizedImageUrl(userProfile.avatar_url, { width: 80, height: 80 })} 
                        alt={userProfile.full_name || 'User'} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <User className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="text-gray-400 hover:text-red-500 transition-colors p-2"
                    title="Log Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAuthOpen(true)}
                  className="text-gray-600 hover:text-emerald-500 transition-colors flex items-center gap-1 font-medium text-sm"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}

              <button 
                onClick={handleSellClick}
                className="bg-orange-500 text-white px-4 sm:px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95 text-sm sm:text-base"
              >
                <PlusCircle className="w-5 h-5" />
                <span>SELL</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
    )}
          <main className={`${location.pathname.startsWith('/messages') ? 'max-w-full px-0' : (viewMode === 'grid' ? 'max-w-7xl px-4' : 'max-w-3xl px-4')} mx-auto transition-all duration-500`}>
        <Suspense fallback={
          <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            <p className="text-gray-500 font-medium animate-pulse">Loading content...</p>
          </div>
        }>
          <Routes>
            <Route path="/" element={
              <>
                <Meta />
                {/* Sticky Search Bar */}
                <div className="sticky top-0 lg:top-16 z-40 bg-gray-50/95 backdrop-blur-md py-3 sm:py-4 -mx-4 px-4 mb-4 border-b border-gray-200/50">
                  <motion.form 
                    onSubmit={handleSearch}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center bg-white rounded-2xl px-3 sm:px-4 py-2 sm:py-3 gap-2 sm:gap-3 shadow-lg shadow-gray-200/50 border border-gray-100 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all"
                  >
                    <Search className="w-5 h-5 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for anything..."
                      className="bg-transparent border-none focus:ring-0 w-full text-sm sm:text-base outline-none font-medium placeholder:text-gray-400"
                    />
                    {searchQuery && (
                      <button 
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setTimeout(() => refetchListings(), 0);
                        }}
                        className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      type="submit"
                      className="bg-emerald-500 text-white px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl font-bold hover:bg-emerald-600 transition-all active:scale-95 shrink-0 text-xs sm:text-base shadow-lg shadow-emerald-500/20"
                    >
                      Search
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsFilterOpen(!isFilterOpen)}
                      className={`p-1.5 sm:p-2 rounded-xl border transition-all flex items-center gap-1 sm:gap-2 ${isFilterOpen ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                    >
                      <Filter className="w-4 h-4" />
                      <span className="text-xs sm:text-sm font-bold">Filters</span>
                    </button>
                  </motion.form>

                  {/* Active Filters & Clear All */}
                  {(searchQuery || selectedCategory || minPrice || maxPrice || regionFilter || subRegionFilter) && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-wrap items-center gap-2 mt-3"
                    >
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">Active Filters:</span>
                      
                      {searchQuery && (
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-emerald-100">
                          Search: {searchQuery}
                        </span>
                      )}
                      
                      {selectedCategory && (
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-emerald-100">
                          Category Active
                        </span>
                      )}

                      {(minPrice || maxPrice) && (
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-emerald-100">
                          Price: {minPrice || '0'} - {maxPrice || '∞'}
                        </span>
                      )}

                      {regionFilter && (
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-emerald-100">
                          {regionFilter}{subRegionFilter ? ` > ${subRegionFilter}` : ''}
                        </span>
                      )}

                      <button 
                        onClick={() => {
                          setSearchQuery('');
                          setMinPrice('');
                          setMaxPrice('');
                          setLocationFilter('');
                          setRegionFilter('');
                          setSubRegionFilter('');
                          setSelectedCategory(null);
                          setSortBy('created_at');
                          setSortOrder('desc');
                          setTimeout(() => refetchListings(), 0);
                        }}
                        className="bg-gray-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-gray-800 transition-all flex items-center gap-1.5 shadow-lg shadow-gray-900/10 active:scale-95"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Clear All
                      </button>
                    </motion.div>
                  )}

                  {/* Filter Pane */}
                  <AnimatePresence>
                    {isFilterOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-white rounded-2xl p-4 mt-3 border border-gray-100 shadow-xl shadow-gray-200/50 grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {/* Sorting */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sort By</label>
                            <div className="flex gap-2">
                              <select 
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="flex-1 bg-gray-50 border-none rounded-xl px-3 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                              >
                                <option value="created_at">Date Posted</option>
                                <option value="price">Price</option>
                              </select>
                              <button 
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                className="p-2 bg-gray-50 rounded-xl text-gray-500 hover:text-emerald-500 transition-colors"
                              >
                                <ArrowUpDown className={`w-4 h-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                              </button>
                            </div>
                          </div>

                          {/* Price Range */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Price Range (Br)</label>
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                placeholder="Min"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                className="w-full bg-gray-50 border-none rounded-xl px-3 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                              />
                              <span className="text-gray-300">-</span>
                              <input 
                                type="number" 
                                placeholder="Max"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                                className="w-full bg-gray-50 border-none rounded-xl px-3 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                              />
                            </div>
                          </div>

                          {/* Location */}
                          <div className="space-y-2 sm:col-span-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Location</label>
                            <div className="space-y-2">
                              <div className="relative">
                                <select 
                                  value={regionFilter}
                                  onChange={(e) => {
                                    setRegionFilter(e.target.value);
                                    setSubRegionFilter('');
                                  }}
                                  className="w-full bg-gray-50 border-none rounded-xl px-3 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none cursor-pointer"
                                >
                                  <option value="">All Regions</option>
                                  {ETHIOPIAN_LOCATIONS.map(loc => (
                                    <option key={loc.name} value={loc.name}>{loc.name}</option>
                                  ))}
                                </select>
                              </div>
                              
                              {regionFilter && ETHIOPIAN_LOCATIONS.find(l => l.name === regionFilter)?.subRegions && (
                                <div className="relative">
                                  <select 
                                    value={subRegionFilter}
                                    onChange={(e) => setSubRegionFilter(e.target.value)}
                                    className="w-full bg-gray-50 border-none rounded-xl px-3 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none cursor-pointer"
                                  >
                                    <option value="">All Sub-Regions</option>
                                    {ETHIOPIAN_LOCATIONS.find(l => l.name === regionFilter)?.subRegions?.map(sub => (
                                      <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Apply Button */}
                          <div className="sm:col-span-3 flex justify-end gap-2 pt-2 border-t border-gray-50">
                            <button 
                              onClick={() => {
                                setMinPrice('');
                                setMaxPrice('');
                                setLocationFilter('');
                                setRegionFilter('');
                                setSubRegionFilter('');
                                setSelectedCategory(null);
                                setSortBy('created_at');
                                setSortOrder('desc');
                              }}
                              className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              Reset All
                            </button>
                            <button 
                              onClick={() => {
                                refetchListings();
                                setIsFilterOpen(false);
                              }}
                              className="bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                            >
                              Apply Filters
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Categories */}
                <section className="mb-8">
                  <CategoryBar 
                    selectedId={selectedCategory} 
                    onSelect={(id) => {
                      const newId = selectedCategory === id ? null : id;
                      setSelectedCategory(newId);
                    }} 
                  />
                </section>

                {/* Listings Section */}
                <section>
                  <div className="flex items-center justify-between gap-2 mb-6">
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                      <div className="relative group min-w-[140px] sm:min-w-[180px]">
                        <select 
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="w-full appearance-none bg-white border border-gray-100/50 rounded-xl sm:rounded-2xl pl-4 sm:pl-5 pr-8 sm:pr-10 py-2 sm:py-3.5 text-[11px] sm:text-sm font-black text-gray-900 shadow-sm hover:border-emerald-500 transition-all cursor-pointer outline-none focus:ring-4 focus:ring-emerald-500/10"
                        >
                          <option value="created_at">Recent</option>
                          <option value="price">Price</option>
                          <option value="likes_count">Most Liked</option>
                        </select>
                        <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-emerald-500 transition-colors">
                          <ArrowUpDown className="w-3 h-3 sm:w-4 h-4" />
                        </div>
                      </div>

                      <button 
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className={`p-2 sm:p-3.5 rounded-xl sm:rounded-2xl border transition-all shadow-sm flex items-center justify-center group ${
                          sortOrder === 'desc' 
                            ? 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50' 
                            : 'bg-emerald-50 border-emerald-100 text-emerald-600 shadow-emerald-100/50'
                        }`}
                        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                      >
                        <ArrowUpDown className={`w-4 h-4 sm:w-5 h-5 transition-transform duration-500 ease-out ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-6 shrink-0">
                      <div className="hidden sm:block h-8 w-px bg-gray-100" />
                      <div className="flex items-center gap-2 sm:gap-3">
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] hidden sm:block">Display</p>
                        <div className="flex items-center bg-gray-50/50 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-gray-100/50 shadow-inner">
                          <button 
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl transition-all duration-300 ${viewMode === 'list' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            <List className="w-4 h-4 sm:w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl transition-all duration-300 ${viewMode === 'grid' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            <LayoutGrid className="w-4 h-4 sm:w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    {isListingsLoading ? (
                      <div className={`grid gap-3 sm:gap-4 ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'flex flex-col'}`}>
                        {Array.from({ length: 10 }).map((_, i) => (
                          <ListingSkeleton key={i} />
                        ))}
                      </div>
                    ) : processedListings.length === 0 ? (
                      <div className="text-center py-20 col-span-full">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Search className="w-10 h-10 text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-medium">No listings found. Be the first to sell!</p>
                        <button 
                          onClick={() => {
                            setSelectedCategory('');
                            setSearchQuery('');
                            setLocationFilter('');
                          }}
                          className="mt-4 text-emerald-600 font-bold hover:underline"
                        >
                          Clear all filters
                        </button>
                      </div>
                    ) : (
                        <VirtualListingGrid 
                          listings={processedListings}
                          columns={columns}
                          viewMode={viewMode}
                          isFetchingNextPage={isFetchingNextPage}
                          hasNextPage={hasNextPage}
                          fetchNextPage={fetchNextPage}
                          handleOpenListing={(l) => handleOpenListing(l)}
                          handleToggleFavorite={handleToggleFavorite}
                        />
                    )}
                  </div>
                </section>

                {/* Why Omni Section */}
                <section className="hidden md:block px-4 py-16 bg-white rounded-[3rem] my-12 mx-4 border border-gray-100/50 shadow-sm">
                  <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-4xl font-black text-gray-900 mb-4">Why Choose OmniMarket?</h2>
                    <p className="text-gray-500 text-lg">We make buying and selling safe, fast and easy for everyone.</p>
                  </div>
                  <div className="grid md:grid-cols-3 gap-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mb-6">
                        <ShieldCheck className="w-10 h-10 text-emerald-500" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Verified Sellers</h3>
                      <p className="text-gray-500">Every seller is verified by our security team to ensure your safety.</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center mb-6">
                        <PlusCircle className="w-10 h-10 text-orange-500" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Free Posting</h3>
                      <p className="text-gray-500">Post your ads for free and reach millions of potential buyers instantly.</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-6">
                        <Search className="w-10 h-10 text-blue-500" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Smart Search</h3>
                      <p className="text-gray-500">Find exactly what you need with our advanced filtering and search.</p>
                    </div>
                  </div>
                </section>
              </>
            } />
            <Route path="/admin/*" element={
              userProfile?.role === 'admin' ? (
                <AdminDashboard 
                  listings={listings} 
                  onBack={() => navigate('/')} 
                  onViewProduct={(listing: any) => handleOpenListing(listing)}
                />
              ) : <Navigate to="/" />
            } />
            <Route path="/items" element={
              user ? (
                <MyListings 
                  user={user}
                  onBack={() => navigate('/')}
                  onViewProduct={(listing: any) => handleOpenListing(listing)}
                />
              ) : <Navigate to="/" />
            } />
            <Route path="/profile" element={
              user ? (
                <ProfileView 
                  user={user}
                  onLogout={handleLogout} 
                  onLogoutSuccess={handleLogoutSuccess}
                  onBack={() => navigate('/')}
                  onAdminClick={() => navigate('/admin')}
                  onViewPublicProfile={(userId: string) => navigate(`/seller/${userId}`)}
                />
              ) : <Navigate to="/" />
            } />
            <Route path="/messages" element={
              user ? (
                <ChatView 
                  initialConversationId={pendingConversationId} 
                  onConversationSelected={() => setPendingConversationId(null)}
                  onBack={() => navigate('/')}
                  onViewProduct={(listing: any) => handleOpenListing(listing)}
                />
              ) : <Navigate to="/" />
            } />
            <Route path="/listing/:id" element={
              <ListingDetailWrapper 
                onOpenListing={(l: Listing) => handleOpenListing(l)}
                onStartChat={handleStartChat}
                setEditingListing={setEditingListing}
                setIsPostAdOpen={setIsPostAdOpen}
                handleDeleteListing={handleDeleteListing}
                handleToggleFavorite={handleToggleFavorite}
                handleViewSellerProfile={handleViewSellerProfile}
              />
            } />
            <Route path="/product/:slug" element={
              <ListingDetailWrapper 
                onOpenListing={(l: Listing) => handleOpenListing(l)}
                onStartChat={handleStartChat}
                setEditingListing={setEditingListing}
                setIsPostAdOpen={setIsPostAdOpen}
                handleDeleteListing={handleDeleteListing}
                handleToggleFavorite={handleToggleFavorite}
                handleViewSellerProfile={handleViewSellerProfile}
              />
            } />
            <Route path="/seller/:id" element={<SellerProfileWrapper handleOpenListing={handleOpenListing} handleStartChat={handleStartChat} />} />
            <Route path="/p/:slug" element={<StaticPage />} />
          </Routes>
        </Suspense>
      </main>

      {!isFullScreenPage && (
        <>
          <footer className="hidden lg:block bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-2xl">O</span>
              </div>
              <span className="text-3xl font-bold tracking-tight">
                Omni<span className="text-emerald-500">Market</span>
              </span>
            </div>
            <p className="text-gray-400 max-w-md text-lg leading-relaxed">
              The leading online marketplace in Africa. We connect buyers and sellers in a safe and secure environment.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-xl mb-6">Quick Links</h4>
            <ul className="space-y-4 text-gray-400">
              <li><Link to="/p/about-us" className="hover:text-emerald-500 transition-colors">About Us</Link></li>
              <li><Link to="/p/contact-support" className="hover:text-emerald-500 transition-colors">Contact Support</Link></li>
              <li><Link to="/p/safety-tips" className="hover:text-emerald-500 transition-colors">Safety Tips</Link></li>
              <li><Link to="/p/terms-of-service" className="hover:text-emerald-500 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-xl mb-6">Categories</h4>
            <ul className="space-y-4 text-gray-400">
              <li><a href="#" className="hover:text-emerald-500 transition-colors">Mobile Phones</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">Vehicles</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">Property</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">Electronics</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-16 pt-8 border-t border-gray-800 text-center text-gray-500">
          <p>© 2026 OmniMarket. All rights reserved.</p>
        </div>
      </footer>

      <BottomNav 
        activeTab={activeTab}
        unreadCount={unreadCount}
        userProfile={userProfile}
        onHome={() => {
          navigate('/');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onItems={() => {
          if (!user) {
            setIsAuthOpen(true);
            return;
          }
          navigate('/items');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSell={() => {
          handleSellClick();
        }}
        onMessages={() => {
          navigate('/messages');
        }}
        onProfile={() => {
          if (!user) {
            setIsAuthOpen(true);
          } else {
            navigate('/profile');
          }
        }}
      />
      </>
    )}

      <PostAdModal 
        isOpen={isPostAdOpen} 
        onClose={() => {
          setIsPostAdOpen(false);
          setEditingListing(null);
        }}
        onSuccess={() => {
          setIsPostAdOpen(false);
          setEditingListing(null);
          queryClient.invalidateQueries({ queryKey: ['listings'] });
        }}
        editListing={editingListing}
      />
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onSuccess={() => {}} 
      />

      <ProfileCompletionModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        initialPhone={userProfile?.phone || ''}
        initialLocation={userProfile?.location || ''}
        onSuccess={(phone, location) => {
          setUserProfile((prev: UserProfile | null) => prev ? { ...prev, phone, location } : null);
          setIsPostAdOpen(true);
        }}
      />

      <ConfirmationModal
        isOpen={!!isDeletingListing}
        onClose={() => setIsDeletingListing(null)}
        onConfirm={confirmDeleteListing}
        title="Delete Listing"
        message="Are you sure you want to delete this listing? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <ConfirmationModal 
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={confirmLogout}
        title="Log Out"
        message="Are you sure you want to log out of your account?"
        confirmText="Log Out"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}

