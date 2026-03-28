import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { 
  ArrowLeft, 
  Share2, 
  Heart, 
  MapPin, 
  ShieldCheck, 
  Phone, 
  MessageCircle,
  Clock,
  User,
  Flag,
  ChevronRight,
  Loader2,
  Edit3,
  Trash2,
  Star,
  Send,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Copy,
  PhoneCall,
  Home,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Listing, api, Review, UserProfile } from '../services/api';
import { supabase } from '../lib/supabase';
import { getOptimizedImageUrl } from '../lib/imageUtils';
import { LazyImage } from './LazyImage';
import { ListingCard } from './ListingCard';
import { ShareModal } from './ShareModal';
import { Meta } from './Meta';
import { getProductSlug } from '../lib/seoUtils';

interface ProductDetailProps {
  product: Listing;
  onBack: () => void;
  onViewProduct: (listing: Listing) => void;
  onStartChat?: (conversationId: string) => void;
  onEdit?: (listing: Listing) => void;
  onDelete?: (listingId: string | number) => void;
  onFavorite?: (listingId: string | number) => void;
  onViewSellerProfile?: (sellerId: string) => void;
}

export const ProductDetail = ({ product, onBack, onViewProduct, onStartChat, onEdit, onDelete, onFavorite, onViewSellerProfile }: ProductDetailProps) => {
  const [activeImage, setActiveImage] = useState(product.image);
  const [relatedItems, setRelatedItems] = useState<Listing[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);
  const [showAllRelated, setShowAllRelated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  // Review state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sellerProfile, setSellerProfile] = useState<UserProfile | null>(null);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [isScrolled, setIsScrolled] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const timeAgo = useMemo(() => {
    if (!product.postedAt) return null;
    try {
      return formatDistanceToNow(new Date(product.postedAt), { addSuffix: true });
    } catch (e) {
      return null;
    }
  }, [product.postedAt]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user || null);
    });
  }, []);

  const isOwner = currentUser?.id === product.seller_id;
  
  const optimizedActiveImage = getOptimizedImageUrl(activeImage, {
    width: 1200,
    height: 900
  });

  const allImages = product.images && product.images.length > 0 
    ? product.images 
    : [product.image];

  useEffect(() => {
    const fetchRelated = async () => {
      setIsLoadingRelated(true);
      try {
        const keywords = product.title
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(' ')
          .filter(word => word.length > 3 && !['sale', 'ethiopia', 'addis', 'ababa', 'brand', 'new', 'used', 'slightly'].includes(word))
          .slice(0, 2)
          .join(' ');

        // 1. Fetch items from same category with name match (High Relevance)
        let nameMatchItems: Listing[] = [];
        if (keywords) {
          nameMatchItems = await api.listings.getAll({ 
            category: product.category_id || product.category,
            search: keywords,
            status: 'active',
            limit: 10
          });
        }

        // 2. Fetch general items from same category
        const categoryItems = await api.listings.getAll({ 
          category: product.category_id || product.category,
          status: 'active',
          limit: 20
        });
        
        // 3. Fetch items from same seller
        let sellerItems: Listing[] = [];
        if (product.seller_id) {
          sellerItems = await api.listings.getAll({
            seller_id: product.seller_id as string,
            status: 'active',
            limit: 10
          });
        }
        
        // Combine and rank: 
        // 1. Name matches (excluding current)
        // 2. Seller items (excluding current)
        // 3. Category items (excluding current)
        const combined = [...nameMatchItems, ...sellerItems, ...categoryItems];
        const unique = combined.reduce((acc: Listing[], current) => {
          const isDuplicate = acc.find(item => item.id === current.id);
          const isCurrentProduct = String(current.id) === String(product.id);
          
          if (!isDuplicate && !isCurrentProduct) {
            return acc.concat([current]);
          } else {
            return acc;
          }
        }, []);
        
        setRelatedItems(unique);
      } catch (error) {
        console.error('Error fetching related items:', error);
      } finally {
        setIsLoadingRelated(false);
      }
    };

    fetchRelated();
    
    const fetchReviews = async () => {
      if (!product.seller_id) return;
      setIsLoadingReviews(true);
      try {
        const data = await api.reviews.getForSeller(product.seller_id as string);
        setReviews(data);
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setIsLoadingReviews(false);
      }
    };

    fetchReviews();

    const fetchSellerProfile = async () => {
      if (!product.seller_id) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', product.seller_id)
          .single();
        
        if (error) throw error;
        setSellerProfile(data);
      } catch (error) {
        console.error('Error fetching seller profile:', error);
      }
    };

    fetchSellerProfile();

    // Reset active image when product changes
    setActiveImage(product.image);
    setShowAllRelated(false);
  }, [product.id]);

  const displayedRelated = showAllRelated ? relatedItems : relatedItems.slice(0, 10);

  const handleStartChat = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Handle unauthenticated user - maybe show login modal?
        toast.error('Please log in to start a chat.');
        return;
      }

      if (!product?.id || !product?.seller_id) {
        toast.error('Product information is missing.');
        return;
      }

      if (product.seller_id === session.user.id) {
        toast.error("You can't chat with yourself!");
        return;
      }

      const initialMessage = `Hi, I'm interested in your item: ${product.title}`;
      const conversation = await api.chats.createConversation(
        product.id, 
        product.seller_id as string, 
        session.access_token,
        initialMessage,
        product.image
      );
      if (conversation?.id) {
        if (onStartChat) {
          onStartChat(conversation.id);
        } else {
          // Fallback to custom event if prop not provided
          const event = new CustomEvent('navigate-to-chat', { detail: { conversationId: conversation.id } });
          window.dispatchEvent(event);
        }
      }
    } catch (err: any) {
      console.error('Error starting chat:', err);
      toast.error(err.message || 'Failed to start chat. Please try again.');
    }
  };

  const [isReporting, setIsReporting] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const handleCopyPhone = () => {
    if (sellerProfile?.phone) {
      navigator.clipboard.writeText(sellerProfile.phone);
      toast.success('Phone number copied to clipboard!');
    }
  };

  const handleCall = () => {
    if (sellerProfile?.phone) {
      window.location.href = `tel:${sellerProfile.phone}`;
    }
  };

  const handleContactClick = () => {
    if (!sellerProfile?.phone) {
      toast.error('This seller has not provided a phone number.');
      return;
    }
    
    // Check if on mobile (width < 1024px)
    if (window.innerWidth < 1024) {
      // Direct call on mobile as requested
      handleCall();
    } else {
      // Show modal on desktop
      setIsContactModalOpen(true);
    }
  };

  const handleReportAd = async () => {
    if (!reportReason) {
      toast.error('Please select a reason for reporting.');
      return;
    }

    setIsSubmittingReport(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to report an ad.');
        return;
      }

      await api.reports.create({
        listing_id: product?.id || '',
        reason: reportReason,
        details: reportDetails
      }, session.access_token);

      toast.success('Thank you for your report. Our team will review it shortly.');
      setIsReporting(false);
      setReportReason('');
      setReportDetails('');
    } catch (err: any) {
      console.error('Error submitting report:', err);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!newRating) {
      toast.error('Please select a rating.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to leave a review.');
        return;
      }

      const newReview = await api.reviews.create({
        seller_id: product?.seller_id as string,
        listing_id: product?.id || '',
        rating: newRating,
        comment: newComment
      }, session.access_token);

      setReviews(prev => [newReview, ...prev]);
      toast.success('Thank you for your review!');
      setIsReviewing(false);
      setNewRating(5);
      setNewComment('');
    } catch (err: any) {
      console.error('Error submitting review:', err);
      toast.error(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const averageRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0;

  const productUrl = `${window.location.origin}/product/${getProductSlug(product.title, product.id)}`;
  
  const productSchema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.title,
    "image": [product.image, ...(product.images || [])],
    "description": product.description,
    "sku": `OMNI-${product.id}`,
    "brand": {
      "@type": "Brand",
      "name": "OmniMarket"
    },
    "offers": {
      "@type": "Offer",
      "url": productUrl,
      "priceCurrency": "ETB",
      "price": product.price,
      "availability": product.status === 'active' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "itemCondition": product.condition === 'Brand New' ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
      "areaServed": {
        "@type": "Country",
        "name": "Ethiopia"
      }
    },
    "aggregateRating": reviews.length > 0 ? {
      "@type": "AggregateRating",
      "ratingValue": averageRating.toFixed(1),
      "reviewCount": reviews.length
    } : undefined
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gray-50 pb-24 lg:pb-0"
    >
      <Meta 
        title={`${product.title} Price in Ethiopia`}
        description={`Find the latest ${product.title} price in Ethiopia. Buy and sell easily on OmniMarket. Located in ${product.location}.`}
        image={product.image}
        url={productUrl}
        type="product"
        schema={productSchema}
      />
      {/* Header - Floating/Sticky */}
      <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 flex items-center justify-between ${
        isScrolled 
          ? 'bg-white shadow-sm py-3' 
          : 'bg-white lg:bg-transparent pt-3 lg:pt-8 pb-3'
      }`}>
        <button 
          onClick={onBack}
          className={`p-2 rounded-full transition-all ${
            isScrolled 
              ? 'bg-gray-100 text-gray-900' 
              : 'bg-gray-100 text-gray-900 lg:bg-black/20 lg:backdrop-blur-md lg:text-white'
          }`}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsShareModalOpen(true)}
            className={`p-2 rounded-full transition-all ${
              isScrolled 
                ? 'bg-gray-100 text-gray-600' 
                : 'bg-gray-100 text-gray-600 lg:bg-black/20 lg:backdrop-blur-md lg:text-white'
            }`}
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => onFavorite?.(product.id)}
            className={`p-2 rounded-full transition-all flex items-center gap-1.5 ${
              isScrolled 
                ? (product.isFavorited ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-600 hover:text-red-500') 
                : (product.isFavorited 
                    ? 'bg-red-50 text-red-500' 
                    : 'bg-gray-100 text-gray-600 lg:bg-black/20 lg:backdrop-blur-md lg:text-white hover:text-red-500')
            }`}
          >
            <Heart className={`w-5 h-5 ${product.isFavorited ? 'fill-current' : ''}`} />
            {product.likes_count !== undefined && product.likes_count > 0 && (
              <span className="text-xs font-black">{product.likes_count}</span>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-16 lg:pt-6 lg:px-4 grid lg:grid-cols-3 gap-8">
        {/* Breadcrumbs */}
        <nav className="lg:col-span-3 flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest px-4 lg:px-0">
          <button onClick={onBack} className="hover:text-emerald-500 flex items-center gap-1 transition-colors">
            <Home className="w-3 h-3" />
            Home
          </button>
          <ChevronRight className="w-3 h-3" />
          <span className="hover:text-emerald-500 transition-colors cursor-pointer">
            {product.category_data?.name || product.category || 'Category'}
          </span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-900 truncate max-w-[150px] sm:max-w-none">
            {product.title}
          </span>
        </nav>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Gallery */}
          <div className="relative lg:rounded-3xl overflow-hidden bg-gray-200">
            {/* Desktop Main Image */}
            <div 
              className="aspect-[4/3] hidden lg:block cursor-zoom-in group"
              onClick={() => setIsZoomOpen(true)}
            >
              <LazyImage 
                src={getOptimizedImageUrl(activeImage, { width: 1200, height: 900 })} 
                alt={product.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white">
                  <ZoomIn className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Mobile Swipeable Gallery - Full Width */}
            <div 
              className="lg:hidden flex overflow-x-auto snap-x snap-mandatory no-scrollbar aspect-[4/3]"
              onScroll={(e) => {
                const scrollLeft = e.currentTarget.scrollLeft;
                const width = e.currentTarget.offsetWidth;
                const index = Math.round(scrollLeft / width);
                if (allImages[index] && allImages[index] !== activeImage) {
                  setActiveImage(allImages[index]);
                }
              }}
            >
              {allImages.map((img: string, idx: number) => (
                <div 
                  key={idx} 
                  className="w-full h-full flex-shrink-0 snap-center cursor-zoom-in"
                  onClick={() => setIsZoomOpen(true)}
                >
                  <LazyImage 
                    src={getOptimizedImageUrl(img, { width: 800, height: 600 })} 
                    alt={`${product.title} - ${idx + 1}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}
            </div>

            {/* Image Indicators (Dots) */}
            {allImages.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
                {allImages.map((_: any, idx: number) => (
                  <div 
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      activeImage === allImages[idx] ? 'bg-emerald-500 w-6' : 'bg-white/60 w-1.5'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Image Count Badge */}
            <div className="absolute bottom-6 right-6 bg-black/40 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full">
              {allImages.indexOf(activeImage) + 1} / {allImages.length}
            </div>
          </div>
          
          {/* Desktop Thumbnails */}
          {allImages.length > 1 && (
            <div className="hidden lg:flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {allImages.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                    activeImage === img ? 'border-emerald-500 scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <LazyImage 
                    src={getOptimizedImageUrl(img, { width: 100, height: 100 })} 
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Product Info Card */}
          <div className="bg-white lg:rounded-3xl p-6 lg:shadow-sm space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {product.isPromoted && (
                    <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider">
                      Promoted
                    </span>
                  )}
                  <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider flex items-center gap-1">
                    <span>{product.category_data?.icon || product.categoryIcon}</span>
                    <span>{product.category_data?.name || product.category}</span>
                  </span>
                </div>
                <span className="text-gray-400 text-xs font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {timeAgo || 'Recently'}
                </span>
              </div>
              
              <div className="space-y-2">
                <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight leading-tight">
                  {product.title}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-gray-500 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    {product.location}
                  </div>
                  {product.condition && (
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="font-bold text-emerald-600 uppercase tracking-wider text-xs">{product.condition}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-4xl font-black text-emerald-600 pt-2">
                Br{product.price.toLocaleString()}
              </div>
            </div>

            <div className="h-[1px] bg-gray-100" />

            {/* Description */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-gray-900">{product.title} for sale in Ethiopia</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {product.description || "No description provided."}
              </p>
            </div>
          </div>

          {/* Seller Info - Mobile (Integrated into main flow) */}
          <div className="lg:hidden bg-white p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 overflow-hidden">
                  {sellerProfile?.avatar_url ? (
                    <img src={sellerProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-7 h-7" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{sellerProfile?.full_name || product.sellerName || 'Verified Seller'}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`w-3 h-3 ${star <= Math.round(averageRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} 
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-gray-500">({reviews.length})</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => product.seller_id && onViewSellerProfile?.(product.seller_id)}
                className="text-emerald-600 font-bold text-sm px-4 py-2 bg-emerald-50 rounded-xl active:scale-95 transition-all"
              >
                View Profile
              </button>
            </div>
          </div>

          {/* Safety Tips */}
          <div className="mx-4 lg:mx-0 bg-amber-50 rounded-3xl p-6 space-y-4 border border-amber-100">
            <div className="flex items-center gap-3 text-amber-700">
              <ShieldCheck className="w-6 h-6" />
              <h3 className="font-bold text-lg">Safety Tips</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: "🤝", text: "Meet in public" },
                { icon: "🔍", text: "Check item first" },
                { icon: "💵", text: "Pay after check" }
              ].map((tip, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/50 p-3 rounded-2xl">
                  <span className="text-xl">{tip.icon}</span>
                  <span className="text-sm font-bold text-amber-900/70">{tip.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews Section */}
          <div className="space-y-6 pt-8 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Seller Reviews</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={`w-4 h-4 ${star <= Math.round(averageRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-gray-900">{averageRating.toFixed(1)}</span>
                  <span className="text-sm text-gray-500">({reviews.length} reviews)</span>
                </div>
              </div>
              {!isOwner && currentUser && !isReviewing && (
                <button 
                  onClick={() => setIsReviewing(true)}
                  className="bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl font-bold hover:bg-emerald-100 transition-all"
                >
                  Write a Review
                </button>
              )}
            </div>

            {/* Review Form */}
            <AnimatePresence>
              {isReviewing && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-gray-50 rounded-3xl p-6 space-y-4 overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">How was your experience?</h3>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setNewRating(star)}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <Star 
                            className={`w-6 h-6 ${star <= newRating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} 
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your experience with this seller..."
                    className="w-full px-6 py-4 rounded-2xl bg-white border-2 border-transparent focus:border-emerald-500 transition-all outline-none min-h-[120px] resize-none font-medium"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsReviewing(false)}
                      className="flex-1 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReviewSubmit}
                      disabled={isSubmittingReview}
                      className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmittingReview ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Submit Review
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reviews List */}
            <div className="space-y-4">
              {isLoadingReviews ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-2" />
                  <p className="text-gray-500 text-sm">Loading reviews...</p>
                </div>
              ) : reviews.length > 0 ? (
                reviews.map((review, idx) => (
                  <div key={review.id || idx} className="bg-white border border-gray-100 rounded-3xl p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                          {review.reviewer?.avatar_url ? (
                            <img src={review.reviewer.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{review.reviewer?.full_name || 'Anonymous'}</h4>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                className={`w-3 h-3 ${star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-gray-600 font-medium leading-relaxed">
                        {review.comment}
                      </p>
                    )}

                    {review.seller_reply && (
                      <div className="ml-6 mt-4 bg-emerald-50/50 border-l-4 border-emerald-500 rounded-r-2xl p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center">
                            <User className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Seller's Reply</span>
                        </div>
                        <p className="text-sm text-emerald-800 font-medium leading-relaxed">
                          {review.seller_reply}
                        </p>
                      </div>
                    )}
                    
                    {review.seller_liked && (
                      <div className="flex items-center gap-1.5 mt-2 text-emerald-600">
                        <Heart className="w-3 h-3 fill-emerald-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Seller liked this</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
                  <p className="text-gray-400 font-medium">No reviews yet. Be the first to review!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Desktop Only */}
        <div className="hidden lg:block space-y-6">
          {/* Seller Info */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6 sticky top-24">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 overflow-hidden">
                {sellerProfile?.avatar_url ? (
                  <img src={sellerProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">{sellerProfile?.full_name || product.sellerName || 'Verified Seller'}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={`w-3.5 h-3.5 ${star <= Math.round(averageRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-gray-500">({reviews.length} reviews)</span>
                </div>
                <p className="text-gray-500 text-xs mt-1">Member since 2023</p>
              </div>
            </div>

            <button 
              onClick={() => product.seller_id && onViewSellerProfile?.(product.seller_id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-bold hover:bg-emerald-100 transition-all active:scale-95"
            >
              <User className="w-4 h-4" />
              View Seller Profile
            </button>

            <div className="space-y-3">
              {isOwner ? (
                <>
                  <button 
                    onClick={() => onEdit?.(product)}
                    className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <Edit3 className="w-5 h-5" />
                    Edit Listing
                  </button>
                  <button 
                    onClick={() => onDelete?.(product?.id || '')}
                    className="w-full bg-red-50 text-red-500 border-2 border-red-500 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete Listing
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={handleContactClick}
                    className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                  >
                    <Phone className="w-5 h-5" />
                    Show Contact
                  </button>
                  <button 
                    onClick={handleStartChat}
                    className="w-full bg-white border-2 border-emerald-500 text-emerald-500 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Start Chat
                  </button>
                  <button 
                    onClick={() => onFavorite?.(product.id)}
                    className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                      product.isFavorited 
                        ? 'bg-red-50 text-red-500 border-2 border-red-500' 
                        : 'bg-white border-2 border-gray-200 text-gray-500 hover:border-red-500 hover:text-red-500'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${product.isFavorited ? 'fill-current' : ''}`} />
                    {product.isFavorited ? 'Favorited' : 'Add to Favorites'}
                    {product.likes_count !== undefined && product.likes_count > 0 && (
                      <span className="ml-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                        {product.likes_count}
                      </span>
                    )}
                  </button>
                </>
              )}
            </div>
            
            <button 
              onClick={() => setIsReporting(true)}
              className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-red-500 transition-colors font-medium py-2"
            >
              <Flag className="w-4 h-4" />
              Report this ad
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Actions */}
      {!isOwner && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 p-4 flex gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <button 
            onClick={handleContactClick}
            className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Phone className="w-5 h-5" />
            Call
          </button>
          <button 
            onClick={handleStartChat}
            className="flex-1 bg-white border-2 border-emerald-500 text-emerald-500 py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Chat
          </button>
        </div>
      )}

      {/* Mobile Owner Actions */}
      {isOwner && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 p-4 flex gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <button 
            onClick={() => onEdit?.(product)}
            className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
          >
            <Edit3 className="w-5 h-5" />
            Edit
          </button>
          <button 
            onClick={() => onDelete?.(product?.id || '')}
            className="flex-1 bg-red-50 text-red-500 border-2 border-red-500 py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            Delete
          </button>
        </div>
      )}

      {/* Contact Modal */}
      <AnimatePresence>
        {isContactModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-gray-900">Contact Seller</h3>
                  <button 
                    onClick={() => setIsContactModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="bg-gray-50 rounded-3xl p-6 flex flex-col items-center gap-4 border border-gray-100">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                    <Phone className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Phone Number</p>
                    <p className="text-2xl font-black text-gray-900">{sellerProfile?.phone || 'No phone number'}</p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <button 
                    onClick={handleCall}
                    className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                  >
                    <PhoneCall className="w-5 h-5" />
                    Call Now
                  </button>
                  <button 
                    onClick={handleCopyPhone}
                    className="w-full bg-white border-2 border-gray-100 text-gray-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:border-emerald-500 hover:text-emerald-500 transition-all active:scale-95"
                  >
                    <Copy className="w-5 h-5" />
                    Copy Number
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      {isReporting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-gray-900">Report Ad</h3>
                <button 
                  onClick={() => setIsReporting(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-6 h-6 rotate-90" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-gray-500 font-medium">Why are you reporting this ad?</p>
                <div className="grid gap-2">
                  {[
                    'Inappropriate content',
                    'Scam or Fraud',
                    'Duplicate ad',
                    'Wrong category',
                    'Item already sold',
                    'Other'
                  ].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setReportReason(reason)}
                      className={`w-full text-left px-6 py-4 rounded-2xl font-bold transition-all border-2 ${
                        reportReason === reason 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-600' 
                          : 'border-gray-100 hover:border-gray-200 text-gray-600'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-900 ml-1">Additional Details (Optional)</label>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Tell us more about the issue..."
                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white transition-all outline-none min-h-[100px] resize-none font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsReporting(false)}
                  className="flex-1 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReportAd}
                  disabled={!reportReason || isSubmittingReport}
                  className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                >
                  {isSubmittingReport ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Flag className="w-5 h-5" />
                      Submit Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Related Items Section */}
      <div className="max-w-7xl mx-auto px-4 py-12 border-t border-gray-100 mt-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {relatedItems.some(item => item.title.toLowerCase().includes(product.title.split(' ')[0].toLowerCase())) 
                ? `More like this ${product.title.split(' ')[0]}` 
                : 'Related Products'}
            </h2>
            <p className="text-gray-500 font-medium">Similar items in {product.category_data?.name || product.category}</p>
          </div>
          {relatedItems.length > 10 && !showAllRelated && (
            <button 
              onClick={() => setShowAllRelated(true)}
              className="flex items-center gap-1 text-emerald-600 font-bold hover:gap-2 transition-all"
            >
              Show More <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {isLoadingRelated ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Finding related items...</p>
          </div>
        ) : relatedItems.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            {displayedRelated.map((item, idx) => (
              <ListingCard
                key={item.id || idx}
                {...item}
                viewMode="grid"
                onClick={() => {
                  onViewProduct(item);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
            <p className="text-gray-400 font-medium">No related items found in this category.</p>
          </div>
        )}
      </div>

      {/* SEO Content Blocks */}
      <div className="max-w-7xl mx-auto px-4 py-16 border-t border-gray-100 space-y-12">
        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Market Insights: {product.title} Price in Ethiopia</h3>
            <p className="text-gray-600 leading-relaxed">
              The average price of <strong>{product.title}</strong> in Ethiopia typically ranges between 
              {" "}<strong>Br{(product.price * 0.8).toLocaleString()}</strong> and 
              {" "}<strong>Br{(product.price * 1.2).toLocaleString()}</strong> ETB depending on the condition and location. 
              On OmniMarket, you can find the best deals for both new and used items in Addis Ababa and other major cities.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {[`${product.title} used Ethiopia`, `cheap ${product.title} Addis Ababa`, `${product.title} for sale Ethiopia`, `buy ${product.title} online Ethiopia`].map(keyword => (
                <span key={keyword} className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  {keyword}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-emerald-50 rounded-[2.5rem] p-8 space-y-4 border border-emerald-100">
            <h3 className="text-xl font-black text-emerald-900">Why OmniMarket is better than Jiji Ethiopia?</h3>
            <ul className="space-y-3">
              {[
                "Better user experience with a faster, modern interface",
                "Smarter search results tailored for the Ethiopian market",
                "Verified sellers and enhanced security protocols",
                "Direct chat and instant notifications for buyers and sellers"
              ].map((point, i) => (
                <li key={i} className="flex items-start gap-3 text-emerald-800 text-sm font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Image Zoom Modal */}
      <AnimatePresence>
        {isZoomOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center"
          >
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent">
              <span className="text-white font-medium">
                {allImages.indexOf(activeImage) + 1} / {allImages.length}
              </span>
              <button 
                onClick={() => setIsZoomOpen(false)}
                className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="w-full h-full flex items-center justify-center">
              <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={8}
                centerOnInit
              >
                {({ zoomIn, zoomOut, resetTransform }) => (
                  <>
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3 z-10">
                      <button 
                        onClick={() => zoomIn()}
                        className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-white hover:bg-white/20 transition-all"
                      >
                        <ZoomIn className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={() => zoomOut()}
                        className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-white hover:bg-white/20 transition-all"
                      >
                        <ZoomOut className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={() => resetTransform()}
                        className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-white hover:bg-white/20 transition-all"
                      >
                        <RotateCcw className="w-6 h-6" />
                      </button>
                    </div>
                    <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                      <img
                        src={activeImage}
                        alt="Zoomed product"
                        className="max-w-full max-h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </TransformComponent>
                  </>
                )}
              </TransformWrapper>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={product.title}
        url={`${window.location.origin}?listing=${product?.id || ''}`}
      />
    </motion.div>
  );
};
