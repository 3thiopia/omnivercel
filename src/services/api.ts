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
    price?: number;
    seller_id?: string;
    status?: string;
    seller?: {
      id: string;
      status: string;
    };
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
      attributes?: Record<string, string>;
      page?: number;
      limit?: number;
    }, _token?: string): Promise<Listing[]> => {
      let query = supabase
        .from('listings')
        .select(`
          *,
          category_data:categories(name, icon),
          profiles(full_name),
          listing_images(image_url)
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
        const searchFields = [
          `title.ilike.%${params.search}%`,
          `description.ilike.%${params.search}%`,
          `attributes->>brand.ilike.%${params.search}%`,
          `attributes->>make.ilike.%${params.search}%`,
          `attributes->>model_series.ilike.%${params.search}%`,
          `attributes->>processor.ilike.%${params.search}%`,
          `attributes->>storage.ilike.%${params.search}%`,
          `attributes->>ram.ilike.%${params.search}%`,
          `attributes->>year.ilike.%${params.search}%`,
          `attributes->>type.ilike.%${params.search}%`,
          `attributes->>material.ilike.%${params.search}%`,
          `attributes->>body_type.ilike.%${params.search}%`,
          `attributes->>fuel_type.ilike.%${params.search}%`,
          `attributes->>transmission.ilike.%${params.search}%`,
          `attributes->>property_type.ilike.%${params.search}%`,
          `attributes->>resolution.ilike.%${params.search}%`,
          `attributes->>movement.ilike.%${params.search}%`
        ];
        query = query.or(searchFields.join(','));
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
      
      // 5. Attribute Filters (JSONB)
      if (params?.attributes) {
        Object.entries(params.attributes).forEach(([key, value]) => {
          if (value) {
            query = query.eq(`attributes->>${key}`, value);
          }
        });
      }
      
      // 6. Sorting
      if (params?.sort && params.sort !== 'likes_count') {
        query = query.order(params.sort, { ascending: params.order === 'asc' });
      } else if (!params?.sort) {
        query = query.order('created_at', { ascending: false });
      }

      // 6. Pagination
      if (params?.page && params?.limit) {
        const from = (params.page - 1) * params.limit;
        const to = from + params.limit - 1;
        query = query.range(from, to);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mappedData = (data || []).map((item: any) => ({
        ...item,
        image: getOptimizedImageUrl(item.thumbnail_url, { width: 800, height: 600 }),
        images: item.listing_images?.map((img: any) => getOptimizedImageUrl(img.image_url, { width: 800, height: 600 })),
        sellerName: item.profiles?.full_name,
        category: item.category_data?.name,
        categoryIcon: item.category_data?.icon,
        postedAt: item.created_at,
        isPromoted: item.is_promoted,
        is_ad: item.is_ad,
        ad_row: item.ad_row,
        ad_col: item.ad_col,
        likes_count: item.likes_count || 0
      }));

      // 6. Memory Sort for likes_count (since Supabase can't easily sort by related count)
      if (params?.sort === 'likes_count') {
        mappedData.sort((a, b) => {
          const order = params.order === 'asc' ? 1 : -1;
          // Sort by likes_count, then by created_at as a tie-breaker
          if (a.likes_count !== b.likes_count) {
            return (a.likes_count - b.likes_count) * order;
          }
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * order;
        });
      }

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
        isFavorited,
        is_ad: data.is_ad,
        ad_row: data.ad_row,
        ad_col: data.ad_col,
        attributes: data.attributes || {}
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
          condition: listing.condition,
          attributes: listing.attributes || {},
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
      const updateData: any = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.price !== undefined) updateData.price = updates.price;
      if (updates.location !== undefined) updateData.location = updates.location;
      if (updates.image !== undefined) updateData.thumbnail_url = updates.image;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.category_id !== undefined) updateData.category_id = updates.category_id;
      if (updates.condition !== undefined) updateData.condition = updates.condition;
      if (updates.attributes !== undefined) updateData.attributes = updates.attributes;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.is_ad !== undefined) updateData.is_ad = updates.is_ad;
      if (updates.ad_row !== undefined) updateData.ad_row = updates.ad_row;
      if (updates.ad_col !== undefined) updateData.ad_col = updates.ad_col;

      const { data, error } = await supabase
        .from('listings')
        .update(updateData)
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
            profiles(full_name),
            listing_images(image_url)
          )
        `)
        .eq('user_id', session.user.id);

      if (error) throw error;

      return (data as any[]).map(f => ({
        ...f.listing,
        image: getOptimizedImageUrl(f.listing.thumbnail_url, { width: 800, height: 600 }),
        images: f.listing.listing_images?.map((img: any) => getOptimizedImageUrl(img.image_url, { width: 800, height: 600 })),
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
      const now = new Date();
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const last14Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

      const [
        { count: totalListings },
        { count: newListings },
        { count: prevListings },
        { count: totalUsers },
        { count: newUsers },
        { count: prevUsers },
        { count: pendingReports },
        { count: newReports },
        { count: prevReports },
        { count: activeAds },
        { count: newAds },
        { count: prevAds }
      ] = await Promise.all([
        supabase.from('listings').select('*', { count: 'exact', head: true }),
        supabase.from('listings').select('*', { count: 'exact', head: true }).gte('created_at', last7Days),
        supabase.from('listings').select('*', { count: 'exact', head: true }).gte('created_at', last14Days).lt('created_at', last7Days),
        
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', last7Days),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', last14Days).lt('created_at', last7Days),
        
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending').gte('created_at', last7Days),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending').gte('created_at', last14Days).lt('created_at', last7Days),
        
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('is_ad', true).eq('status', 'active'),
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('is_ad', true).eq('status', 'active').gte('created_at', last7Days),
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('is_ad', true).eq('status', 'active').gte('created_at', last14Days).lt('created_at', last7Days)
      ]);

      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? `+${current}` : '0%';
        const change = ((current - previous) / previous) * 100;
        return `${change >= 0 ? '+' : ''}${change.toFixed(0)}%`;
      };

      return [
        { label: 'Total Listings', value: (totalListings || 0).toString(), change: calculateChange(newListings || 0, prevListings || 0), icon: 'Package', color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Active Users', value: (totalUsers || 0).toString(), change: calculateChange(newUsers || 0, prevUsers || 0), icon: 'Users', color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Pending Reports', value: (pendingReports || 0).toString(), change: calculateChange(newReports || 0, prevReports || 0), icon: 'Flag', color: 'text-red-600', bg: 'bg-red-50' },
        { label: 'Active Ads', value: (activeAds || 0).toString(), change: calculateChange(newAds || 0, prevAds || 0), icon: 'BarChart3', color: 'text-purple-600', bg: 'bg-purple-50' }
      ];
    },
  },
  admin: {
    getRecentActivity: async (): Promise<any[]> => {
      const { data: listings } = await supabase
        .from('listings')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(5);
      
      const { data: reports } = await supabase
        .from('reports')
        .select('*, profiles(full_name), listings(title)')
        .order('created_at', { ascending: false })
        .limit(5);
      
      const activity = [
        ...(listings || []).map(l => ({
          id: `listing-${l.id}`,
          type: 'listing',
          title: 'New Listing',
          description: `${l.profiles?.full_name || 'A user'} posted "${l.title}"`,
          time: l.created_at,
          icon: 'Package',
          color: 'text-blue-500',
          bg: 'bg-blue-50'
        })),
        ...(reports || []).map(r => ({
          id: `report-${r.id}`,
          type: 'report',
          title: 'New Report',
          description: `Listing "${r.listings?.title || 'Unknown'}" was reported for ${r.reason}`,
          time: r.created_at,
          icon: 'Flag',
          color: 'text-red-500',
          bg: 'bg-red-50'
        }))
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      
      return activity.slice(0, 8);
    },
    getChartData: async (): Promise<any[]> => {
      try {
        const last7Days = [...Array(7)].map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d;
        });

        const startDate = last7Days[0];
        startDate.setHours(0, 0, 0, 0);

        const [listings, users, reports] = await Promise.all([
          supabase.from('listings').select('created_at').gte('created_at', startDate.toISOString()),
          supabase.from('profiles').select('created_at').gte('created_at', startDate.toISOString()),
          supabase.from('reports').select('created_at').gte('created_at', startDate.toISOString())
        ]);

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        return last7Days.map(date => {
          const dateStr = date.toISOString().split('T')[0];
          const dayName = days[date.getDay()];

          return {
            name: dayName,
            listings: (listings.data || []).filter(l => l.created_at.startsWith(dateStr)).length,
            users: (users.data || []).filter(u => u.created_at.startsWith(dateStr)).length,
            reports: (reports.data || []).filter(r => r.created_at.startsWith(dateStr)).length
          };
        });
      } catch (error) {
        console.error('Error fetching chart data:', error);
        // Fallback to mock data if query fails
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return days.map(day => ({
          name: day,
          listings: 0,
          users: 0,
          reports: 0
        }));
      }
    }
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

      const { data, error } = await supabase
        .from('conversations')
        .select('buyer_id, seller_id, buyer_unread_count, seller_unread_count')
        .or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`);

      if (error) throw error;

      const totalUnread = (data as any[]).reduce((sum, conv) => {
        const isBuyer = conv.buyer_id === session.user.id;
        return sum + (isBuyer ? (conv.buyer_unread_count || 0) : (conv.seller_unread_count || 0));
      }, 0);

      return { count: totalUnread };
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

        const unreadCount = conv.buyer_id === session.user.id ? (conv.buyer_unread_count || 0) : (conv.seller_unread_count || 0);

        const lastMessage = conv.messages?.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        if (!groupedConversations[otherUser.id]) {
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
            all_conversation_ids: [conv.id]
          };
        } else {
          const existing = groupedConversations[otherUser.id];
          existing.unread_count += unreadCount;
          existing.all_conversation_ids.push(conv.id);
          
          if (new Date(conv.last_message_at) > new Date(existing.last_message_at)) {
            existing.id = conv.id;
            existing.listing_id = conv.listing_id;
            existing.listing = {
              id: conv.listing?.id,
              title: conv.listing?.title,
              image: conv.listing?.thumbnail_url
            };
            existing.last_message = lastMessage?.content;
            existing.last_message_at = conv.last_message_at;
          }
        }
      });

      return Object.values(groupedConversations).sort((a: any, b: any) => 
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
    },
    getMessages: async (conversationIds: string | string[], _token: string): Promise<any[]> => {
      const ids = Array.isArray(conversationIds) ? conversationIds : [conversationIds];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', ids)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Mark messages as read
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('conversation_id', ids)
          .neq('sender_id', session.user.id);

        // Reset unread count for the current user in these conversations
        for (const id of ids) {
          await supabase
            .from('conversations')
            .update({ buyer_unread_count: 0 })
            .eq('id', id)
            .eq('buyer_id', session.user.id);

          await supabase
            .from('conversations')
            .update({ seller_unread_count: 0 })
            .eq('id', id)
            .eq('seller_id', session.user.id);
        }
      }

      return data;
    },
    sendMessage: async (conversationId: string, content: string, _token: string, imageUrl?: string): Promise<any> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Unauthorized');

      const { data, error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          sender_id: session.user.id,
          content,
          image_url: imageUrl
        }])
        .select()
        .single();

      if (error) throw error;

      // Update last message time
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Increment unread count for the recipient
      const { data: conv } = await supabase
        .from('conversations')
        .select('buyer_id, seller_id, buyer_unread_count, seller_unread_count')
        .eq('id', conversationId)
        .single();

      if (conv) {
        const isBuyer = conv.buyer_id === session.user.id;
        if (isBuyer) {
          await supabase
            .from('conversations')
            .update({ seller_unread_count: (conv.seller_unread_count || 0) + 1 })
            .eq('id', conversationId);
        } else {
          await supabase
            .from('conversations')
            .update({ buyer_unread_count: (conv.buyer_unread_count || 0) + 1 })
            .eq('id', conversationId);
        }
      }

      return data;
    },
    deleteMessage: async (messageId: string, _token: string): Promise<any> => {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);
        
      if (error) throw error;
    },
    createConversation: async (listingId: string | number, sellerId: string, _token: string, initialMessage?: string, productImageUrl?: string): Promise<any> => {
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
        
        // If it exists, we might still want to send the product context if it's a different listing
        if (initialMessage && productImageUrl) {
          await api.chats.sendMessage(existing.id, `${initialMessage} [PRODUCT_IMAGE]${productImageUrl}`, _token);
        }
        
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

      // Send initial message if provided
      if (initialMessage && productImageUrl) {
        await api.chats.sendMessage(data.id, `${initialMessage} [PRODUCT_IMAGE]${productImageUrl}`, _token);
      }

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
          listing:listings!listing_id(
            id, 
            title, 
            thumbnail_url, 
            seller_id, 
            status,
            seller:profiles!seller_id(id, status)
          ),
          reporter:profiles!reporter_id(id, full_name, email)
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
