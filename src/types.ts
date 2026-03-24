export interface Listing {
  id: string;
  title: string;
  price: number;
  location: string;
  image: string;
  images?: string[];
  isPromoted: boolean;
  description?: string;
  category?: string;
  categoryIcon?: string;
  category_id?: string;
  category_data?: {
    name: string;
    icon: string;
    parent?: {
      name: string;
    } | null;
  };
  sellerName?: string;
  seller_id?: string;
  postedAt?: string;
  status?: 'active' | 'sold' | 'pending' | 'hidden' | 'deleted';
  views?: number;
  likes_count?: number;
  isFavorited?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  joinedAt: string;
  status: 'active' | 'banned' | 'suspended';
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
