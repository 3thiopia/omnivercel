import { supabase } from '../lib/supabase';
import { getOptimizedImageUrl } from '../lib/imageUtils';
import { Listing, User } from '../types';
export type { Listing, User };

export interface Category {
  id: string;
  name: string;
  count: number;
  icon: string;
  parent_id?: string;
}

export interface Stat {
  label: string;
  value: string;
  change: string;
  icon: string;
  color: string;
  bg: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  phone?: string;
  location?: string;
  role: string;
  status?: 'active' | 'banned' | 'suspended';
  created_at?: string;
}

export interface Report {
  id: string;
  listing_id: string;
  reporter_id: string;
  reason: string;
  details?: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  created_at: string;
  listing?: {
    id: string;
    title: string;
    thumbnail_url: string;
    seller_id?: string;
  };
  reporter?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface Review {
  id: string;
  reviewer_id: string;
  seller_id: string;
  listing_id?: string;
  rating: number;
  comment?: string;
  seller_reply?: string;
  seller_liked?: boolean;
  replied_at?: string;
  created_at: string;
  reviewer?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  listing?: {
    id: string;
    title: string;
    thumbnail_url?: string;
  };
}

let categoriesCache: Category[] | null = null;

export const api = {
  categories: {
    getAll: async (): Promise<Category[]> => {
      if (categoriesCache) return categoriesCache;
      
      try {
        const { data, error } = await supabase
          .from('categories')
          .select(`
            *,
            listings(count)
          `);
          
        if (error) throw error;

        // 1. Map initial data with direct counts
        const mappedData = (data as any[]).map(cat => ({
          ...cat,
          directCount: cat.listings?.[0]?.count || 0,
          count: cat.listings?.[0]?.count || 0
        }));

        // 2. Calculate aggregate counts for parents
        const finalData = mappedData.map(cat => {
          if (!cat.parent_id) {
            const childrenDirectCount = mappedData
              .filter(child => child.parent_id === cat.id)
              .reduce((sum, child) => sum + child.directCount, 0);
            
            return {
              ...cat,
              count: cat.directCount + childrenDirectCount
            };
          }
          return cat;
        });

        // 3. Sort by count descending
        const sortedData = finalData.sort((a, b) => b.count - a.count);

        categoriesCache = sortedData as Category[];
        return sortedData as Category[];
      } catch (err) {
        console.error('Error in api.categories.getAll:', err);
        // Fallback to simple fetch if complex one fails
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name');
        
        if (error) throw error;
        return (data as any[]).map(c => ({ ...c, count: 0 }));
      }
    },
    create: async (name: string, icon: string, parent_id?: string): Promise<Category> => {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name, icon, parent_id }])
        .select()
        .single();
        
      if (error) throw error;
      categoriesCache = null;
      return data as Category;
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      categoriesCache = null;
    },
    seed: async (): Promise<any> => {
      const categories = [
        { name: 'Mobile Phones', icon: '📱' },
        { name: 'Vehicles', icon: '🚗' },
        { name: 'Property', icon: '🏠' },
        { name: 'Electronics', icon: '💻' },
        { name: 'Home & Garden', icon: '🛋️' },
        { name: 'Fashion', icon: '👕' },
        { name: 'Jobs', icon: '💼' },
        { name: 'Services', icon: '🛠️' },
        { name: 'Health & Beauty', icon: '💄' },
        { name: 'Agriculture', icon: '🚜' }
      ];
      
      const { data, error } = await supabase
        .from('categories')
        .insert(categories)
        .select();
        
      if (error) throw error;
      categoriesCache = null;
      return data;
    },
    syncCounts: async (): Promise<any> => {
      return { success: true };
    },
    update: async (id: string, updates: Partial<Category>): Promise<Category> => {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      categoriesCache = null;
      return data as Category;
    },
  },
  listings: {
    getAll: async (params?: { 
      search?: string; 
      category?: string; 
      status?: string; 
      seller_id?: string;
      sort?: string;
      order?: 'asc' | 'desc';
      min_price?: number;
      max_price?: number;
      location?: string;
    }, _token?: string): Promise<Listing[]> => {
      let query = supabase
        .from('listings')
        .select(`
          *,
          category_data:categories(name, icon),
          profiles(full_name)
        `);

      // 1. Status Filter
      if (params?.status === 'all') {
        // Show all statuses (for admin/my items)
      } else if (params?.status) {
        query = query.eq('status', params.status);
      } else {
        // Default to active for main page
        query = query.eq('status', 'active');
      }

      // 2. Search Filter
      if (params?.search) {
        query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
      }
      
      // 3. Category Filter
      if (params?.category) {
        // Get all categories to find sub-categories
        const { data: allCategories } = await supabase.from('categories').select('id, parent_id');
        const categoriesList = allCategories || [];
        
        const subCategoryIds = categoriesList
          .filter(c => c.parent_id === params.category)
          .map(c => c.id);
        
        const categoryIds = [params.category, ...subCategoryIds];
        query = query.in('category_id', categoryIds);
      }

      // 4. Other Filters
      if (params?.seller_id) query = query.eq('seller_id', params.seller_id);
      if (params?.min_price) query = query.gte('price', params.min_price);
      if (params?.max_price) query = query.lte('price', params.max_price);
      if (params?.location) query = query.ilike('location', `%${params.location}%`);
      
      // 5. Sorting
      if (params?.sort) {
        query = query.order(params.sort, { ascending: params.order === 'asc' });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      const mappedData = (data || []).map((item: any) => ({
        ...item,
        image: getOptimizedImageUrl(item.thumbnail_url, { width: 800, height: 600 }),
        sellerName: item.profiles?.full_name,
        category: item.category_data?.name,
        categoryIcon: item.category_data?.icon,
        postedAt: item.created_at,
        isPromoted: item.is_promoted
      }));

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: favorites } = await supabase
          .from('favorites')
          .select('listing_id')
          .eq('user_id', session.user.id);
          
        const favoriteIds = new Set(favorites?.map(f => f.listing_id));
        return mappedData.map(listing => ({
          ...listing,
          isFavorited: favoriteIds.has(listing.id)
        }));
      }

      return mappedData;
    },
    getById: async (id: string | number, _token?: string): Promise<Listing | null> => {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          category_data:categories(name, icon),
          profiles(full_name),
          listing_images(image_url)
        `)
        .eq('id', id)
        .single();

      if (error || !data) return null;

      const { data: { session } } = await supabase.auth.getSession();
      let isFavorited = false;
      if (session?.user) {
        const { data: fav } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('listing_id', id)
          .maybeSingle();
        isFavorited = !!fav;
      }

      return {
        ...data,
        image: getOptimizedImageUrl(data.thumbnail_url, { width: 800, height: 600 }),
        images: data.listing_images?.map((img: any) => getOptimizedImageUrl(img.image_url, { width: 800, height: 600 })),
        sellerName: data.profiles?.full_name,
        category: data.category_data?.name,
        categoryIcon: data.category_data?.icon,
        postedAt: data.created_at,
        isPromoted: data.is_promoted,
        isFavorited
      };
    },
    create: async (listing: any, _token?: string): Promise<Listing> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Unauthorized');

      const { data, error } = await supabase
        .from('listings')
        .insert([{
          title: listing.title,
          price: listing.price,
          location: listing.location,
          thumbnail_url: listing.image,
          description: listing.description,
          category_id: listing.category_id,
          seller_id: session.user.id,
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;

      if (listing.images && listing.images.length > 0) {
        const imageInserts = listing.images.map((url: string, index: number) => ({
          listing_id: data.id,
          image_url: url,
          display_order: index
        }));
        await supabase.from('listing_images').insert(imageInserts);
      }

      return data as Listing;
    },
    update: async (id: string | number, updates: any, _token?: string): Promise<Listing> => {
      const { data, error } = await supabase
        .from('listings')
        .update({
          title: updates.title,
          price: updates.price,
          location: updates.location,
          thumbnail_url: updates.image,
          description: updates.description,
          category_id: updates.category_id,
          status: updates.status
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update images if provided
      if (updates.images && updates.images.length > 0) {
        // Delete existing images
        await supabase.from('listing_images').delete().eq('listing_id', id);
        
        // Insert new images
        const imageInserts = updates.images.map((url: string, index: number) => ({
          listing_id: id,
          image_url: url,
          display_order: index
        }));
        await supabase.from('listing_images').insert(imageInserts);
      }

      return data as Listing;
    },
    delete: async (id: string | number, _token: string): Promise<void> => {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    },
    toggleFavorite: async (listingId: string | number, _token: string): Promise<{ favorited: boolean }> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Unauthorized');

      const { data: existing } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('listing_id', listingId)
        .maybeSingle();

      if (existing) {
        await supabase.from('favorites').delete().eq('id', existing.id);
        return { favorited: false };
      } else {
        await supabase.from('favorites').insert([{ user_id: session.user.id, listing_id: listingId }]);
        return { favorited: true };
      }
    },
    getFavorites: async (_token: string): Promise<Listing[]> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return [];

      const { data, error } = await supabase
        .from('favorites')
        .select(`
          listing:listings(
            *,
            category_data:categories(name, icon),
            profiles(full_name)
          )
        `)
        .eq('user_id', session.user.id);

      if (error) throw error;

      return (data as any[]).map(f => ({
        ...f.listing,
        image: getOptimizedImageUrl(f.listing.thumbnail_url, { width: 800, height: 600 }),
        sellerName: f.listing.profiles?.full_name,
        category: f.listing.category_data?.name,
        categoryIcon: f.listing.category_data?.icon,
        postedAt: f.listing.created_at,
        isPromoted: f.listing.is_promoted,
        isFavorited: true
      }));
    },
  },
  stats: {
    getAll: async (): Promise<Stat[]> => {
      const { count: listingsCount } = await supabase.from('listings').select('*', { count: 'exact', head: true });
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: reportsCount } = await supabase.from('reports').select('*', { count: 'exact', head: true });
      
      return [
        { label: 'Total Listings', value: (listingsCount || 0).toString(), change: '+12%', icon: 'Package', color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Active Users', value: (usersCount || 0).toString(), change: '+5%', icon: 'User', color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Pending Reports', value: (reportsCount || 0).toString(), change: '-2%', icon: 'ShieldCheck', color: 'text-red-600', bg: 'bg-red-50' },
        { label: 'Revenue', value: '$12,450', change: '+18%', icon: 'ArrowUpDown', color: 'text-purple-600', bg: 'bg-purple-50' }
      ];
    },
  },
  users: {
    getMe: async (_token: string): Promise<UserProfile> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Unauthorized');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    getAll: async (_token: string): Promise<UserProfile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserProfile[];
    },
    getById: async (id: string): Promise<UserProfile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    updateMe: async (profile: Partial<UserProfile>, _token: string): Promise<UserProfile> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Unauthorized');

      const { data, error } = await supabase
        .from('profiles')
        .update(profile)
        .eq('id', session.user.id)
        .select()
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    deleteMe: async (_token: string): Promise<void> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('profiles').update({ status: 'suspended' }).eq('id', session.user.id);
        await supabase.auth.signOut();
      }
    },
    uploadAvatar: async (file: File, _token: string): Promise<UserProfile> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Unauthorized');

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('listings')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('listings')
        .getPublicUrl(filePath);

      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session.user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return data as UserProfile;
    },
    updateStatus: async (id: string, status: string, _token: string): Promise<UserProfile> => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as UserProfile;
    }
  },
  chats: {
    getUnreadCount: async (_token: string): Promise<{ count: number }> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return { count: 0 };

      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', session.user.id);

      if (error) throw error;
      return { count: count || 0 };
    },
    getConversations: async (_token: string): Promise<any[]> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return [];

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          listing:listings(id, title, thumbnail_url),
          buyer:profiles!conversations_buyer_id_fkey(id, full_name, avatar_url),
          seller:profiles!conversations_seller_id_fkey(id, full_name, avatar_url),
          messages(content, created_at, sender_id, is_read)
        `)
        .or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Group by other user ID to consolidate chats
      const groupedConversations: Record<string, any> = {};

      (data as any[]).forEach(conv => {
        const otherUser = conv.buyer_id === session.user.id ? conv.seller : conv.buyer;
        if (!otherUser) return;

        const lastMessage = conv.messages?.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        
        const buyerUnread = conv.messages?.filter((m: any) => !m.is_read && m.sender_id === conv.seller_id).length || 0;
        const sellerUnread = conv.messages?.filter((m: any) => !m.is_read && m.sender_id === conv.buyer_id).length || 0;
        const unreadCount = conv.buyer_id === session.user.id ? buyerUnread : sellerUnread;

        if (!groupedConversations[otherUser.id] || new Date(conv.last_message_at) > new Date(groupedConversations[otherUser.id].last_message_at)) {
          groupedConversations[otherUser.id] = {
            id: conv.id,
            listing_id: conv.listing_id,
            listing: {
              id: conv.listing?.id,
              title: conv.listing?.title,
              image: conv.listing?.thumbnail_url
            },
            other_user: otherUser,
            seller: conv.seller,
            buyer: conv.buyer,
            last_message: lastMessage?.content,
            last_message_at: conv.last_message_at,
            unread_count: unreadCount,
            // Keep track of all conversation IDs for this user to mark all as read later if needed
            all_conversation_ids: [conv.id]
          };
        } else {
          // Add unread count and conversation ID to existing group
          groupedConversations[otherUser.id].unread_count += unreadCount;
          groupedConversations[otherUser.id].all_conversation_ids.push(conv.id);
        }
      });

      return Object.values(groupedConversations).sort((a: any, b: any) => 
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
    },
    getMessages: async (conversationId: string, _token: string): Promise<any[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', session.user.id);
      }

      return data;
    },
    sendMessage: async (conversationId: string, content: string, _token: string): Promise<any> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Unauthorized');

      const { data, error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          sender_id: session.user.id,
          content
        }])
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      return data;
    },
    deleteMessage: async (messageId: string, _token: string): Promise<any> => {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);
        
      if (error) throw error;
    },
    createConversation: async (listingId: string | number, sellerId: string, _token: string): Promise<any> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Unauthorized');

      // Check for ANY existing conversation between these two users
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(buyer_id.eq.${session.user.id},seller_id.eq.${sellerId}),and(buyer_id.eq.${sellerId},seller_id.eq.${session.user.id})`)
        .order('last_message_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Update the listing_id to the current one so the context is updated
        await supabase
          .from('conversations')
          .update({ listing_id: listingId })
          .eq('id', existing.id);
        return existing;
      }

      const { data, error } = await supabase
        .from('conversations')
        .insert([{
          listing_id: listingId,
          buyer_id: session.user.id,
          seller_id: sellerId
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  },
  reports: {
    create: async (report: { listing_id: string | number; reason: string; details?: string }, _token: string): Promise<Report> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Unauthorized');

      const { data, error } = await supabase
        .from('reports')
        .insert([{
          listing_id: report.listing_id,
          reason: report.reason,
          details: report.details,
          reporter_id: session.user.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data as Report;
    },
    getAll: async (_token: string): Promise<Report[]> => {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          listing:listings(id, title, thumbnail_url, seller_id),
          reporter:profiles!reports_reporter_id_fkey(id, full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Report[];
    },
    updateStatus: async (id: string, status: string, _token: string): Promise<Report> => {
      const { data, error } = await supabase
        .from('reports')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Report;
    }
  },
  reviews: {
    getForSeller: async (sellerId: string): Promise<Review[]> => {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(id, full_name, avatar_url),
          listing:listings(id, title, thumbnail_url)
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Review[];
    },
    create: async (review: { seller_id: string; listing_id?: string | number; rating: number; comment?: string }, _token: string): Promise<Review> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Unauthorized');

      const { data, error } = await supabase
        .from('reviews')
        .insert([{
          ...review,
          reviewer_id: session.user.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data as Review;
    },
    update: async (id: string, updates: { seller_reply?: string; seller_liked?: boolean; replied_at?: string }, _token: string): Promise<Review> => {
      const { data, error } = await supabase
        .from('reviews')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Review;
    }
  }
};
