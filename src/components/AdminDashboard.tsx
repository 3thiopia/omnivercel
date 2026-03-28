import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  BarChart3, 
  Settings, 
  Search, 
  MoreVertical,
  CheckCircle2,
  XCircle,
  Trash2,
  ExternalLink,
  ArrowLeft,
  Menu,
  X,
  Plus,
  Edit2,
  FolderTree,
  Flag,
  UserX,
  UserCheck,
  MapPin,
  RotateCcw,
  History,
  Clock,
  ChevronRight,
  AlertTriangle,
  Calendar,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  LineChart,
  Line
} from 'recharts';
import { getOptimizedImageUrl } from '../lib/imageUtils';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Listing, User } from '../types';
import { api, Category, Stat, Report, UserProfile } from '../services/api';
import { ConfirmationModal } from './ConfirmationModal';

interface AdminDashboardProps {
  listings: Listing[];
  onBack: () => void;
  onViewProduct: (listing: Listing) => void;
  onEditListing: (listing: Listing) => void;
}

const ICON_MAP: Record<string, any> = {
  Package,
  Users,
  BarChart3,
  FolderTree,
  AlertTriangle,
  TrendingUp,
  Flag,
  Activity
};

export const AdminDashboard = ({ listings, onBack, onViewProduct, onEditListing }: AdminDashboardProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'users' | 'categories' | 'reports' | 'ads'>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [localListings, setLocalListings] = useState<Listing[]>(listings);
  const [adModal, setAdModal] = useState<{ isOpen: boolean; listing: Listing | null; row: number; col: number }>({
    isOpen: false,
    listing: null,
    row: 1,
    col: 1
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📁');
  const [newCategoryParentId, setNewCategoryParentId] = useState<string>('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editParentId, setEditParentId] = useState<string>('');
  const [stats, setStats] = useState<Stat[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportView, setReportView] = useState<'active' | 'history'>('active');
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [listingSearchQuery, setListingSearchQuery] = useState('');
  const [listingCategoryFilter, setListingCategoryFilter] = useState('all');
  const [listingStatusFilter, setListingStatusFilter] = useState('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [adSearchQuery, setAdSearchQuery] = useState('');
  const [adCategoryFilter, setAdCategoryFilter] = useState('all');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });

  useEffect(() => {
    if (activeTab === 'categories') {
      fetchCategories();
    }
    if (activeTab === 'overview') {
      fetchStats();
      fetchOverviewData();
    }
    if (activeTab === 'listings') {
      fetchListings();
      fetchCategories();
    }
    if (activeTab === 'reports') {
      fetchReports();
    }
    if (activeTab === 'users') {
      fetchUsers();
    }
    if (activeTab === 'ads') {
      fetchListings();
      fetchCategories();
    }
  }, [activeTab]);

  const fetchOverviewData = async () => {
    setIsLoadingOverview(true);
    try {
      const [activity, chart] = await Promise.all([
        api.admin.getRecentActivity(),
        api.admin.getChartData()
      ]);
      setRecentActivity(activity);
      setChartData(chart);
    } catch (error) {
      console.error('Error fetching overview data:', error);
    } finally {
      setIsLoadingOverview(false);
    }
  };

  const fetchReports = async () => {
    setIsLoadingReports(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const data = await api.reports.getAll(session.access_token);
      console.log('AdminDashboard: Fetched reports:', data);
      setReports(data);
    } catch (error) {
      console.error('AdminDashboard: Error loading reports:', error);
      toast.error('Failed to load reports. Check console for details.');
    } finally {
      setIsLoadingReports(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const data = await api.users.getAll(session.access_token);
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleUpdateUserStatus = async (userId: string, status: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await api.users.updateStatus(userId, status, session.access_token);
      toast.success(`User status updated to ${status}`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleUpdateReportStatus = async (id: string, status: Report['status']) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await api.reports.updateStatus(id, status, session.access_token);
      fetchReports();
    } catch (error) {
      console.error('Error updating report status:', error);
    }
  };

  const handleReportAction = async (report: Report, action: 'unlist' | 'delete' | 'ban' | 'dismiss' | 'resolve' | 'activate' | 'unban_seller') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const token = session.access_token;

      if (action === 'unlist') {
        if (report.listing_id) {
          await api.listings.update(report.listing_id, { status: 'hidden' }, token);
          await api.reports.updateStatus(report.id, 'resolved', token);
          toast.success('Listing unlisted and report resolved');
        }
      } else if (action === 'activate') {
        if (report.listing_id) {
          await api.listings.update(report.listing_id, { status: 'active' }, token);
          toast.success('Listing is now public again');
        }
      } else if (action === 'unban_seller') {
        const sellerId = report.listing?.seller_id;
        if (sellerId) {
          await api.users.updateStatus(sellerId, 'active', token);
          toast.success('Seller has been unbanned');
        }
      } else if (action === 'delete') {
        if (report.listing_id) {
          setConfirmModal({
            isOpen: true,
            title: 'Delete Listing',
            message: 'Are you sure you want to delete this listing? This will also resolve the report.',
            type: 'danger',
            onConfirm: async () => {
              try {
                await api.listings.delete(report.listing_id, token);
                await api.reports.updateStatus(report.id, 'resolved', token);
                toast.success('Listing deleted and report resolved');
                fetchReports();
                fetchListings();
              } catch (error) {
                console.error('Error deleting listing from report:', error);
                toast.error('Failed to delete listing');
              }
              setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
          });
        }
        return; // Modal handles the rest
      } else if (action === 'ban') {
        const sellerId = report.listing?.seller_id;
        if (!sellerId) {
          toast.error('Could not find seller information');
          return;
        }
        setConfirmModal({
          isOpen: true,
          title: 'Ban Seller',
          message: 'Are you sure you want to ban the seller of this listing? This will also resolve the report.',
          type: 'danger',
          onConfirm: async () => {
            try {
              await api.users.updateStatus(sellerId, 'banned', token);
              await api.reports.updateStatus(report.id, 'resolved', token);
              toast.success('Seller banned and report resolved');
              fetchReports();
              fetchUsers();
            } catch (error) {
              console.error('Error banning seller:', error);
              toast.error('Failed to ban seller');
            }
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }
        });
        return;
      } else if (action === 'dismiss') {
        await api.reports.updateStatus(report.id, 'dismissed', token);
        toast.success('Report dismissed');
      } else if (action === 'resolve') {
        await api.reports.updateStatus(report.id, 'resolved', token);
        toast.success('Report marked as resolved');
      }

      fetchReports();
      fetchListings();
    } catch (error) {
      console.error('Error performing report action:', error);
      toast.error('Action failed');
    }
  };

  const handleUpdateAd = async (listingId: string, isAd: boolean, row: number, col: number) => {
    try {
      await api.listings.update(listingId, { is_ad: isAd, ad_row: row, ad_col: col });
      setLocalListings(prev => prev.map(l => l.id === listingId ? { ...l, is_ad: isAd, ad_row: row, ad_col: col } : l));
      toast.success(isAd ? 'Listing promoted as Ad' : 'Listing removed from Ads');
      setAdModal({ isOpen: false, listing: null, row: 1, col: 1 });
    } catch (error) {
      toast.error('Failed to update Ad status');
    }
  };

  const handleBanUser = async (userId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Ban User',
      message: "Are you sure you want to ban this user? All their listings will remain but they won't be able to log in.",
      type: 'danger',
      onConfirm: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;
          await api.users.updateStatus(userId, 'banned', session.access_token);
          toast.success('User has been banned successfully.');
          fetchReports();
          fetchUsers();
        } catch (error) {
          console.error('Error banning user:', error);
          toast.error('Failed to ban user.');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const fetchListings = async () => {
    try {
      // Fetch all listings for admin view, not just active ones
      const data = await api.listings.getAll({ status: 'all' });
      setLocalListings(data);
    } catch (err) {
      console.error('Error fetching listings:', err);
    }
  };

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const data = await api.stats.getAll();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const data = await api.categories.getAll();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const newCat = await api.categories.create(
        newCategoryName, 
        newCategoryIcon, 
        newCategoryParentId || undefined
      );
      setCategories([...categories, newCat]);
      setNewCategoryName('');
      setNewCategoryParentId('');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editName.trim()) return;
    try {
      const updatedCat = await api.categories.update(editingCategory.id, {
        name: editName,
        icon: editIcon,
        parent_id: editParentId || undefined
      });
      setCategories(categories.map(c => c.id === updatedCat.id ? updatedCat : c));
      setEditingCategory(null);
      toast.success('Category updated successfully');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await api.categories.delete(id);
      setCategories(categories.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const handleDeleteListing = async (id: string | number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Listing',
      message: 'Are you sure you want to delete this listing? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          if (!token) throw new Error('Unauthorized');
          await api.listings.delete(id, token);
          fetchListings();
        } catch (error) {
          console.error('Error deleting listing:', error);
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleUpdateStatus = async (id: string | number, status: Listing['status']) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await api.listings.update(id, { status }, session.access_token);
      toast.success(`Listing status updated to ${status}`);
      fetchListings();
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update listing status');
    }
  };

  const handleMarkAsSold = async (id: string | number) => {
    handleUpdateStatus(id, 'sold');
  };

  const filteredListings = localListings.filter(l => {
    const matchesSearch = l.title.toLowerCase().includes(listingSearchQuery.toLowerCase()) ||
                         l.id.toString().includes(listingSearchQuery) ||
                         l.location.toLowerCase().includes(listingSearchQuery.toLowerCase());
    const matchesCategory = listingCategoryFilter === 'all' || l.category_id === listingCategoryFilter || l.category_data?.name === listingCategoryFilter;
    const matchesStatus = listingStatusFilter === 'all' || l.status === listingStatusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filteredAdsListings = localListings.filter(l => {
    const isAvailable = !l.is_ad && l.status === 'active';
    const matchesSearch = l.title.toLowerCase().includes(adSearchQuery.toLowerCase()) ||
                         l.id.toString().includes(adSearchQuery);
    const matchesCategory = adCategoryFilter === 'all' || l.category_id === adCategoryFilter || l.category_data?.name === adCategoryFilter;
    return isAvailable && matchesSearch && matchesCategory;
  });

  const SidebarContent = () => (
    <>
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">J</span>
          </div>
          <span className="text-xl font-black tracking-tight text-gray-900">Admin<span className="text-emerald-500">Panel</span></span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-full"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <button 
          onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'overview' ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <LayoutDashboard className="w-5 h-5" />
          Overview
        </button>
        <button 
          onClick={() => { setActiveTab('listings'); setIsSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'listings' ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Package className="w-5 h-5" />
          Listings
        </button>
        <button 
          onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'users' ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Users className="w-5 h-5" />
          Users
        </button>
        <button 
          onClick={() => { setActiveTab('categories'); setIsSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'categories' ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <FolderTree className="w-5 h-5" />
          Categories
        </button>
        <button 
          onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'reports' ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Flag className="w-5 h-5" />
          Reports
        </button>
        <button 
          onClick={() => { setActiveTab('ads'); setIsSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'ads' ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <BarChart3 className="w-5 h-5" />
          Ads Management
        </button>
        <div className="pt-4 pb-2">
          <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">System</p>
        </div>
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all">
          <Settings className="w-5 h-5" />
          Settings
        </button>
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={onBack}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          Exit Admin
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex relative pb-24 lg:pb-0">
      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 px-2 py-2 z-50 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-around">
          {[
            { id: 'overview', icon: LayoutDashboard, label: 'Home' },
            { id: 'listings', icon: Package, label: 'Ads' },
            { id: 'users', icon: Users, label: 'Users' },
            { id: 'reports', icon: Flag, label: 'Alerts' },
            { id: 'ads', icon: BarChart3, label: 'Promote' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all min-w-[64px] ${
                activeTab === item.id 
                  ? 'text-emerald-600 bg-emerald-50' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
          <button 
            onClick={onBack}
            className="flex flex-col items-center gap-1 p-2 text-red-500 min-w-[64px]"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-tighter">Exit</span>
          </button>
        </div>
      </nav>

      {/* Mobile Sidebar Overlay (Keeping for Settings/System if needed, or can remove) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
            />
            <motion.aside 
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-50 lg:hidden flex flex-col shadow-2xl"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3 flex-1">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-xl lg:text-2xl font-black text-gray-900 uppercase tracking-tight">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h1>
            <div className="hidden md:flex items-center bg-gray-100 rounded-xl px-4 py-2 w-full max-w-md gap-3 ml-4">
              <Search className="w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search listings, users, orders..." 
                className="bg-transparent border-none focus:ring-0 text-sm w-full"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live</span>
            </div>
            <div className="h-8 w-[1px] bg-gray-200 mx-1 lg:mx-2"></div>
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-900">Admin</p>
              </div>
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gray-900 rounded-lg lg:rounded-xl flex items-center justify-center text-white font-bold text-sm lg:text-base">
                AU
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
          {activeTab === 'overview' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">Dashboard Overview</h1>
                  <p className="text-gray-500 font-medium text-sm lg:text-base">Welcome back! Here's what's happening today.</p>
                </div>
                <div className="flex gap-2 lg:gap-3">
                  <button className="flex-1 sm:flex-none bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">
                    Export
                  </button>
                  <button className="flex-1 sm:flex-none bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
                    Report
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {isLoadingStats ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm animate-pulse">
                      <div className="h-12 w-12 bg-gray-200 rounded-2xl mb-4"></div>
                      <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                      <div className="h-8 w-32 bg-gray-200 rounded"></div>
                    </div>
                  ))
                ) : (
                  stats.map((stat, idx) => {
                    const Icon = ICON_MAP[stat.icon] || Package;
                    const isPositive = stat.change.startsWith('+');
                    return (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <Icon className={`w-6 h-6 ${stat.color}`} />
                          </div>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {stat.change}
                          </div>
                        </div>
                        <h3 className="text-gray-500 text-xs font-black uppercase tracking-widest mb-1">{stat.label}</h3>
                        <p className="text-3xl font-black text-gray-900 tracking-tight">{stat.value}</p>
                      </motion.div>
                    );
                  })
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Section */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Platform Growth</h3>
                        <p className="text-gray-500 text-sm font-medium">Activity overview for the last 7 days</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Listings</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Users</span>
                        </div>
                      </div>
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorListings" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              borderRadius: '20px', 
                              border: 'none', 
                              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                              padding: '12px 16px'
                            }}
                            itemStyle={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="listings" 
                            stroke="#10b981" 
                            strokeWidth={4}
                            fillOpacity={1} 
                            fill="url(#colorListings)" 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="users" 
                            stroke="#3b82f6" 
                            strokeWidth={4}
                            fillOpacity={1} 
                            fill="url(#colorUsers)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'Add Category', icon: Plus, color: 'text-blue-600', bg: 'bg-blue-50', tab: 'categories' },
                      { label: 'Review Reports', icon: Flag, color: 'text-red-600', bg: 'bg-red-50', tab: 'reports' },
                      { label: 'Manage Ads', icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50', tab: 'ads' },
                      { label: 'User List', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', tab: 'users' }
                    ].map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveTab(action.tab as any)}
                        className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center gap-3 group"
                      >
                        <div className={`w-10 h-10 ${action.bg} ${action.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <action.icon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col h-full">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Recent Activity</h3>
                    <Activity className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="space-y-6 flex-1 overflow-y-auto pr-2 scrollbar-hide">
                    {recentActivity.map((item, idx) => {
                      const Icon = ICON_MAP[item.icon] || Package;
                      return (
                        <div key={item.id} className="flex gap-4 relative group">
                          {idx !== recentActivity.length - 1 && (
                            <div className="absolute left-5 top-10 bottom-[-24px] w-[2px] bg-gray-50 group-hover:bg-gray-100 transition-colors"></div>
                          )}
                          <div className={`w-10 h-10 ${item.bg} ${item.color} rounded-xl flex items-center justify-center flex-shrink-0 z-10 shadow-sm`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 pt-1">
                            <p className="text-xs font-black text-gray-900 uppercase tracking-tight mb-0.5">{item.title}</p>
                            <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-1">{item.description}</p>
                            <div className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                              <Clock className="w-3 h-3" />
                              {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button 
                    onClick={() => setActiveTab('listings')}
                    className="mt-8 w-full py-3 bg-gray-50 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all"
                  >
                    View All Activity
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'listings' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className="text-2xl lg:text-3xl font-black text-gray-900">Manage Listings</h2>
                <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
                  <div className="relative flex-1 sm:flex-none sm:min-w-[240px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search listings..." 
                      value={listingSearchQuery}
                      onChange={(e) => setListingSearchQuery(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-2 text-sm font-bold text-gray-600 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                  <select 
                    value={listingCategoryFilter}
                    onChange={(e) => setListingCategoryFilter(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-600 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all flex-shrink-0"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <select 
                    value={listingStatusFilter}
                    onChange={(e) => setListingStatusFilter(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-600 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all flex-shrink-0"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="sold">Sold</option>
                    <option value="hidden">Unlisted</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-gray-100">
                  {filteredListings.map((listing) => (
                    <div key={listing.id} className="p-4 space-y-4">
                      <div className="flex items-center gap-3">
                        <img src={listing.image} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-bold text-gray-900 truncate pr-2">{listing.title}</p>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase flex-shrink-0 ${listing.isPromoted ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-500'}`}>
                                {listing.isPromoted ? 'Promoted' : 'Standard'}
                              </span>
                              {listing.condition && (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                                  {listing.condition}
                                </span>
                              )}
                              {listing.status === 'sold' && (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-red-50 text-red-600">
                                  Sold
                                </span>
                              )}
                              {listing.status === 'hidden' && (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-orange-50 text-orange-600">
                                  Unlisted
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-400 truncate">{listing.location}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-sm font-black text-gray-900">Br{listing.price.toLocaleString()}</p>
                            <p className="text-[10px] font-mono text-gray-400">#{listing.id}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-50">
                        {listing.status === 'pending' && (
                          <button 
                            onClick={() => handleUpdateStatus(listing.id, 'active')}
                            className="px-3 py-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg text-[10px] font-bold uppercase transition-all"
                          >
                            Approve
                          </button>
                        )}
                        {listing.status === 'active' && (
                          <button 
                            onClick={() => handleUpdateStatus(listing.id, 'hidden')}
                            className="px-3 py-1.5 text-orange-600 hover:bg-orange-50 rounded-lg text-[10px] font-bold uppercase transition-all"
                          >
                            Unlist
                          </button>
                        )}
                        {listing.status === 'hidden' && (
                          <button 
                            onClick={() => handleUpdateStatus(listing.id, 'active')}
                            className="px-3 py-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg text-[10px] font-bold uppercase transition-all"
                          >
                            List Back
                          </button>
                        )}
                        <button 
                          onClick={() => listing.seller_id && handleBanUser(listing.seller_id)}
                          className="px-3 py-1.5 text-red-700 hover:bg-red-50 rounded-lg text-[10px] font-bold uppercase transition-all"
                          title="Ban Seller"
                        >
                          Ban User
                        </button>
                        {listing.status !== 'sold' && listing.status !== 'hidden' && (
                          <button 
                            onClick={() => handleMarkAsSold(listing.id)}
                            className="px-3 py-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg text-[10px] font-bold uppercase transition-all"
                          >
                            Mark Sold
                          </button>
                        )}
                        {listing.status === 'sold' && (
                          <button 
                            onClick={() => handleUpdateStatus(listing.id, 'active')}
                            className="px-3 py-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg text-[10px] font-bold uppercase transition-all"
                          >
                            Make Available
                          </button>
                        )}
                        <button 
                          onClick={() => onEditListing(listing)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-[10px] font-bold uppercase transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button 
                          onClick={() => onViewProduct(listing)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-[10px] font-bold uppercase transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View
                        </button>
                        <button 
                          onClick={() => handleDeleteListing(listing.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg text-[10px] font-bold uppercase transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto border border-gray-100 rounded-2xl mx-6 mb-6">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">ID</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Listing</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Price</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredListings.map((listing) => (
                        <tr key={listing.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4 text-xs font-mono text-gray-400">#{listing.id}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img 
                                src={getOptimizedImageUrl(listing.image, { width: 100, height: 100 })} 
                                alt="" 
                                className="w-12 h-12 rounded-xl object-cover flex-shrink-0 shadow-sm" 
                              />
                              <div className="min-w-0 max-w-[250px]">
                                <p className="text-sm font-bold text-gray-900 truncate group-hover:text-emerald-600 transition-colors">{listing.title}</p>
                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider truncate flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5" />
                                  {listing.location}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-black text-gray-900">Br{listing.price.toLocaleString()}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-black uppercase border ${listing.isPromoted ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                                {listing.isPromoted ? 'Promoted' : 'Standard'}
                              </span>
                              {listing.condition && (
                                <span className="inline-flex px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                                  {listing.condition}
                                </span>
                              )}
                              {listing.status === 'sold' && (
                                <span className="inline-flex px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-red-50 text-red-600 border border-red-100">
                                  Sold
                                </span>
                              )}
                              {listing.status === 'pending' && (
                                <span className="inline-flex px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-orange-50 text-orange-600 border border-orange-100">
                                  Pending
                                </span>
                              )}
                              {listing.status === 'hidden' && (
                                <span className="inline-flex px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-orange-50 text-orange-600 border border-orange-100">
                                  Unlisted
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              {listing.status === 'pending' && (
                                <button 
                                  onClick={() => handleUpdateStatus(listing.id, 'active')}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                  title="Approve"
                                >
                                  <CheckCircle2 className="w-5 h-5" />
                                </button>
                              )}
                              {listing.status === 'active' && (
                                <button 
                                  onClick={() => handleUpdateStatus(listing.id, 'hidden')}
                                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                                  title="Unlist"
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                              )}
                              {listing.status === 'hidden' && (
                                <button 
                                  onClick={() => handleUpdateStatus(listing.id, 'active')}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                  title="List Back"
                                >
                                  <CheckCircle2 className="w-5 h-5" />
                                </button>
                              )}
                              <button 
                                onClick={() => listing.seller_id && handleBanUser(listing.seller_id)}
                                className="p-2 text-red-700 hover:bg-red-50 rounded-xl transition-all"
                                title="Ban Seller"
                              >
                                <UserX className="w-5 h-5" />
                              </button>
                              {listing.status !== 'sold' && listing.status !== 'hidden' && (
                                <button 
                                  onClick={() => handleMarkAsSold(listing.id)}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                  title="Mark Sold"
                                >
                                  <CheckCircle2 className="w-5 h-5" />
                                </button>
                              )}
                              {listing.status === 'sold' && (
                                <button 
                                  onClick={() => handleUpdateStatus(listing.id, 'active')}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                  title="Make Available"
                                >
                                  <RotateCcw className="w-5 h-5" />
                                </button>
                              )}
                              <button 
                                onClick={() => onEditListing(listing)}
                                className="p-2 text-gray-400 hover:text-blue-500 transition-all rounded-xl hover:bg-gray-50"
                                title="Edit"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => onViewProduct(listing)}
                                className="p-2 text-gray-400 hover:text-emerald-500 transition-all rounded-xl hover:bg-gray-50"
                              >
                                <ExternalLink className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteListing(listing.id)}
                                className="p-2 text-gray-400 hover:text-red-500 transition-all rounded-xl hover:bg-red-50"
                                title="Delete"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'categories' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <h2 className="text-2xl lg:text-3xl font-black text-gray-900">Manage Categories</h2>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Sync Category Counts',
                          message: 'This will recalculate the number of active listings for each category. Continue?',
                          type: 'info',
                          onConfirm: async () => {
                            try {
                              await api.categories.syncCounts();
                              fetchCategories();
                            } catch (error) {
                              console.error('Error syncing counts:', error);
                            }
                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                          }
                        });
                      }}
                      className="bg-blue-50 text-blue-600 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-100/50"
                    >
                      Sync Counts
                    </button>
                    <button 
                      onClick={async () => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Seed Categories',
                          message: 'This will add common categories to your database. Continue?',
                          type: 'info',
                          onConfirm: async () => {
                            try {
                              await api.categories.seed();
                              fetchCategories();
                            } catch (error) {
                              console.error('Error seeding categories:', error);
                            }
                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                          }
                        });
                      }}
                      className="bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100/50"
                    >
                      Seed Defaults
                    </button>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-2">Add New Category</h3>
                  <div className="flex flex-col sm:flex-row bg-gray-50/50 p-1.5 rounded-2xl gap-1.5 w-full">
                    <div className="flex gap-1.5 flex-1">
                      <input 
                        type="text" 
                        placeholder="Name" 
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="flex-1 px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 border-none bg-white rounded-xl font-bold outline-none transition-all shadow-sm"
                      />
                      <input 
                        type="text" 
                        placeholder="Icon" 
                        value={newCategoryIcon}
                        onChange={(e) => setNewCategoryIcon(e.target.value)}
                        className="w-16 px-2 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 border-none bg-white rounded-xl text-center font-bold outline-none transition-all shadow-sm"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-1.5 flex-1">
                      <select
                        value={newCategoryParentId}
                        onChange={(e) => setNewCategoryParentId(e.target.value)}
                        className="flex-1 px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 border-none bg-white rounded-xl font-bold text-gray-600 appearance-none cursor-pointer outline-none transition-all shadow-sm"
                      >
                        <option value="">Main Category</option>
                        {categories.filter(c => !c.parent_id).map((c, idx) => (
                          <option key={c.id || idx} value={c.id}>Parent: {c.name}</option>
                        ))}
                      </select>
                      <button 
                        onClick={handleAddCategory}
                        className="bg-gray-900 text-white px-6 py-2.5 rounded-xl flex items-center justify-center hover:bg-gray-800 transition-all font-bold text-sm shadow-lg shadow-gray-900/10 active:scale-95"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {isLoadingCategories ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-8">
                  <AnimatePresence>
                    {editingCategory && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                      >
                        <motion.div 
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.95, opacity: 0 }}
                          className="bg-white rounded-[2rem] w-full max-w-md p-6 sm:p-8 shadow-2xl border border-gray-100"
                        >
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Edit Category</h3>
                            <button 
                              onClick={() => setEditingCategory(null)}
                              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                              <X className="w-5 h-5 text-gray-500" />
                            </button>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Category Name</label>
                              <input 
                                type="text" 
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 border border-gray-100 bg-gray-50/50 rounded-xl font-bold outline-none transition-all"
                              />
                            </div>
                            
                            <div className="grid grid-cols-4 gap-4">
                              <div className="col-span-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Icon</label>
                                <input 
                                  type="text" 
                                  value={editIcon}
                                  onChange={(e) => setEditIcon(e.target.value)}
                                  className="w-full px-2 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 border border-gray-100 bg-gray-50/50 rounded-xl text-center font-bold outline-none transition-all"
                                />
                              </div>
                              <div className="col-span-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Parent Category</label>
                                <select
                                  value={editParentId}
                                  onChange={(e) => setEditParentId(e.target.value)}
                                  className="w-full px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 border border-gray-100 bg-gray-50/50 rounded-xl font-bold text-gray-600 appearance-none cursor-pointer outline-none transition-all"
                                >
                                  <option value="">Main Category</option>
                                  {categories.filter(c => !c.parent_id && c.id !== editingCategory.id).map((c, idx) => (
                                    <option key={c.id || idx} value={c.id}>Parent: {c.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                              <button 
                                onClick={() => setEditingCategory(null)}
                                className="flex-1 px-6 py-3 rounded-xl font-bold text-sm text-gray-500 hover:bg-gray-50 transition-all"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={handleUpdateCategory}
                                className="flex-1 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/10 active:scale-95"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {categories.filter(c => !c.parent_id).map((mainCat, index) => (
                    <motion.div 
                      key={mainCat.id} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="space-y-4 bg-white p-4 sm:p-6 rounded-3xl sm:rounded-[2rem] border border-gray-100 shadow-sm"
                    >
                      <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-inner flex-shrink-0">
                            {mainCat.icon}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-black text-lg sm:text-xl text-gray-900 uppercase tracking-tight truncate">{mainCat.name}</h3>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {mainCat.count} Total
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => {
                              setEditingCategory(mainCat);
                              setEditName(mainCat.name);
                              setEditIcon(mainCat.icon);
                              setEditParentId(mainCat.parent_id || '');
                            }}
                            className="p-2 text-gray-400 hover:text-emerald-500 transition-all rounded-xl hover:bg-emerald-50"
                          >
                            <Edit2 className="w-4 h-4 sm:w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteCategory(mainCat.id)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-all rounded-xl hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 sm:w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                        {categories.filter(c => String(c.parent_id) === String(mainCat.id)).map((subCat) => (
                          <div key={subCat.id} className="bg-gray-50/50 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-gray-100/50 hover:bg-white hover:shadow-md hover:border-emerald-100 transition-all group">
                            <div className="flex justify-between items-center gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-lg flex-shrink-0">{subCat.icon}</span>
                                <span className="text-xs sm:text-sm font-bold text-gray-700 truncate">{subCat.name}</span>
                              </div>
                              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button 
                                  onClick={() => {
                                    setEditingCategory(subCat);
                                    setEditName(subCat.name);
                                    setEditIcon(subCat.icon);
                                    setEditParentId(subCat.parent_id || '');
                                  }}
                                  className="p-1 text-gray-400 hover:text-emerald-500 transition-all rounded-lg hover:bg-emerald-50"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteCategory(subCat.id)}
                                  className="p-1 text-gray-400 hover:text-red-500 transition-all rounded-lg hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        <button 
                          onClick={() => {
                            setNewCategoryParentId(String(mainCat.id));
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="border-2 border-dashed border-gray-100 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 text-gray-400 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50/30 transition-all group"
                        >
                          <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Add Sub</span>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Reports Summary Header */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pending Reports</p>
                  <div className="flex items-end gap-2">
                    <h3 className="text-3xl font-black text-gray-900">
                      {reports.filter(r => (r.status?.toLowerCase() || 'pending') === 'pending').length}
                    </h3>
                    <span className="text-xs font-bold text-orange-500 mb-1.5 flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      Needs Review
                    </span>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Resolved Total</p>
                  <div className="flex items-end gap-2">
                    <h3 className="text-3xl font-black text-gray-900">
                      {reports.filter(r => r.status?.toLowerCase() === 'resolved').length}
                    </h3>
                    <span className="text-xs font-bold text-emerald-500 mb-1.5 flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      Completed
                    </span>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Dismissed</p>
                  <div className="flex items-end gap-2">
                    <h3 className="text-3xl font-black text-gray-900">
                      {reports.filter(r => r.status?.toLowerCase() === 'dismissed').length}
                    </h3>
                    <span className="text-xs font-bold text-gray-400 mb-1.5">Archived</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl lg:text-3xl font-black text-gray-900">Ad Reports</h2>
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setReportView('active')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${reportView === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Active
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${reportView === 'active' ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-400'}`}>
                        {reports.filter(r => (r.status?.toLowerCase() || 'pending') === 'pending').length}
                      </span>
                    </button>
                    <button 
                      onClick={() => setReportView('history')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${reportView === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      History
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${reportView === 'history' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-400'}`}>
                        {reports.filter(r => (r.status?.toLowerCase() || 'pending') !== 'pending').length}
                      </span>
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder="Search reports..."
                      value={reportSearchQuery}
                      onChange={(e) => setReportSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none w-full sm:w-64"
                    />
                  </div>
                  <button 
                    onClick={fetchReports}
                    className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2"
                  >
                    <RotateCcw className={`w-4 h-4 ${isLoadingReports ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                {isLoadingReports ? (
                  <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : reports.filter(r => {
                  const status = r.status?.toLowerCase() || 'pending';
                  return reportView === 'active' ? status === 'pending' : status !== 'pending';
                }).length === 0 ? (
                  <div className="text-center py-20">
                    {reportView === 'active' ? (
                      <>
                        <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">All caught up!</h3>
                        <p className="text-gray-500 max-w-xs mx-auto">No pending reports to review. Everything is looking good.</p>
                      </>
                    ) : (
                      <>
                        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                          <History className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">No history yet</h3>
                        <p className="text-gray-500 max-w-xs mx-auto">Resolved and dismissed reports will appear here for your records.</p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Mobile Report Cards */}
                    <div className="lg:hidden divide-y divide-gray-50">
                      {reports
                        .filter(report => {
                          const status = report.status?.toLowerCase() || 'pending';
                          return reportView === 'active' ? status === 'pending' : status !== 'pending';
                        })
                        .filter(report => {
                          if (!reportSearchQuery) return true;
                          const query = reportSearchQuery.toLowerCase();
                          return (
                            report.listing?.title?.toLowerCase().includes(query) ||
                            report.reporter?.full_name?.toLowerCase().includes(query) ||
                            report.reporter?.email?.toLowerCase().includes(query) ||
                            report.reason?.toLowerCase().includes(query) ||
                            report.listing_id?.toString().includes(query)
                          );
                        })
                        .map((report) => (
                          <div 
                            key={report.id} 
                            onClick={() => setSelectedReport(report)}
                            className="p-4 space-y-4 active:bg-gray-50 transition-all"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="relative flex-shrink-0">
                                  <img 
                                    src={report.listing?.thumbnail_url || 'https://picsum.photos/seed/placeholder/100/100'} 
                                    alt="" 
                                    className="w-12 h-12 rounded-xl object-cover shadow-sm" 
                                  />
                                  {report.listing?.status === 'hidden' && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center">
                                      <XCircle className="w-2 h-2 text-white" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-gray-900 truncate">
                                    {report.listing?.title || 'Unknown Listing'}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[9px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">#{report.listing_id}</span>
                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                      report.status === 'pending' ? 'bg-orange-50 text-orange-600' :
                                      report.status === 'resolved' ? 'bg-emerald-50 text-emerald-600' :
                                      'bg-gray-100 text-gray-500'
                                    }`}>
                                      {report.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-[10px] font-black text-red-600 uppercase tracking-tight">{report.reason}</p>
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                  {new Date(report.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </p>
                              </div>
                            </div>
                            
                            {report.details && (
                              <p className="text-[11px] text-gray-500 line-clamp-2 bg-gray-50 p-2 rounded-lg italic">
                                "{report.details}"
                              </p>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-500">
                                  {report.reporter?.full_name?.charAt(0) || 'A'}
                                </div>
                                <p className="text-[10px] text-gray-400 font-medium truncate max-w-[100px]">
                                  {report.reporter?.full_name || 'Anonymous'}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                {report.status === 'pending' && (
                                  <>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReportAction(report, 'resolve');
                                      }}
                                      className="p-2 text-emerald-500 bg-emerald-50 rounded-xl"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReportAction(report, 'dismiss');
                                      }}
                                      className="p-2 text-gray-400 bg-gray-50 rounded-xl"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReportAction(report, 'delete');
                                  }}
                                  className="p-2 text-red-500 bg-red-50 rounded-xl"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto scrollbar-hide">
                      <table className="w-full text-left min-w-[900px]">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                          <tr>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Listing Info</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reporter</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Violation</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Timeline</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Management</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                        {reports
                          .filter(report => {
                            const status = report.status?.toLowerCase() || 'pending';
                            return reportView === 'active' ? status === 'pending' : status !== 'pending';
                          })
                          .filter(report => {
                            if (!reportSearchQuery) return true;
                            const query = reportSearchQuery.toLowerCase();
                            return (
                              report.listing?.title?.toLowerCase().includes(query) ||
                              report.reporter?.full_name?.toLowerCase().includes(query) ||
                              report.reporter?.email?.toLowerCase().includes(query) ||
                              report.reason?.toLowerCase().includes(query) ||
                              report.listing_id?.toString().includes(query)
                            );
                          })
                          .map((report) => (
                          <tr 
                            key={report.id} 
                            onClick={() => setSelectedReport(report)}
                            className="group hover:bg-gray-50/50 transition-all cursor-pointer"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  <img 
                                    src={report.listing?.thumbnail_url || 'https://picsum.photos/seed/placeholder/100/100'} 
                                    alt="" 
                                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-white shadow-sm" 
                                  />
                                  {report.listing?.status === 'hidden' && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center">
                                      <XCircle className="w-2 h-2 text-white" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-gray-900 truncate max-w-[180px] group-hover:text-emerald-600 transition-colors">
                                    {report.listing?.title || 'Unknown Listing'}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">#{report.listing_id}</span>
                                    {report.listing?.seller?.status === 'banned' && (
                                      <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter bg-red-50 px-1.5 py-0.5 rounded">Banned Seller</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{report.reporter?.full_name || 'Anonymous'}</p>
                                <p className="text-[10px] text-gray-400 truncate max-w-[150px] font-medium">{report.reporter?.email}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                  <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{report.reason}</p>
                                </div>
                                {report.details && (
                                  <p className="text-[10px] text-gray-500 line-clamp-2 max-w-[200px] leading-relaxed italic">"{report.details}"</p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="inline-flex flex-col items-center">
                                <p className="text-xs font-bold text-gray-900">
                                  {new Date(report.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </p>
                                <p className="text-[10px] text-gray-400 font-medium">
                                  {new Date(report.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                report.status === 'pending' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                report.status === 'resolved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                'bg-gray-100 text-gray-500 border border-gray-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  report.status === 'pending' ? 'bg-orange-500 animate-pulse' :
                                  report.status === 'resolved' ? 'bg-emerald-500' :
                                  'bg-gray-400'
                                }`}></span>
                                {report.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-1">
                                <div className="flex items-center gap-1">
                                  {/* Restore Action (if hidden) */}
                                  {report.listing?.status === 'hidden' && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReportAction(report, 'activate');
                                      }}
                                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest"
                                      title="Make Listing Public Again"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      Restore
                                    </button>
                                  )}
                                  
                                  {/* Unban Action (if banned) */}
                                  {report.listing?.seller?.status === 'banned' && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReportAction(report, 'unban_seller');
                                      }}
                                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest"
                                      title="Unban Seller"
                                    >
                                      <UserCheck className="w-3 h-3" />
                                      Unban
                                    </button>
                                  )}
                                </div>

                                {report.status === 'pending' ? (
                                  <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-100 ml-1">
                                    {report.listing?.status === 'active' && (
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleReportAction(report, 'unlist');
                                        }}
                                        className="p-2 text-orange-500 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                                        title="Unlist Listing"
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReportAction(report, 'resolve');
                                      }}
                                      className="p-2 text-emerald-500 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                                      title="Mark as Resolved"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReportAction(report, 'dismiss');
                                      }}
                                      className="p-2 text-gray-400 hover:white hover:shadow-sm rounded-lg transition-all"
                                      title="Dismiss"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : null}
                                
                                <div className="h-4 w-[1px] bg-gray-200 mx-1"></div>
                                
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReportAction(report, 'delete');
                                  }}
                                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                  title="Delete Listing Permanently"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                {report.listing?.seller?.status !== 'banned' && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReportAction(report, 'ban');
                                    }}
                                    className="p-2 text-gray-400 hover:text-red-700 hover:bg-red-100 rounded-lg transition-all"
                                    title="Ban Seller"
                                  >
                                    <UserX className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className="text-2xl lg:text-3xl font-black text-gray-900">User Management</h2>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:flex-none sm:min-w-[240px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search users..." 
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-2 text-sm font-bold text-gray-600 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                  <button 
                    onClick={fetchUsers}
                    className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                {isLoadingUsers ? (
                  <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-20">
                    <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900">No users found</h3>
                  </div>
                ) : (
                  <>
                    {/* Mobile User Cards */}
                    <div className="lg:hidden divide-y divide-gray-50">
                      {users
                        .filter(u => 
                          u.full_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                          u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                          u.id.toString().includes(userSearchQuery)
                        )
                        .map((user) => (
                        <div key={user.id} className="p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {user.avatar_url ? (
                                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Users className="w-6 h-6 text-gray-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black text-gray-900 truncate">{user.full_name}</p>
                                <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                                user.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                              }`}>
                                {user.role}
                              </span>
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                                user.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                              }`}>
                                {user.status || 'active'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                              Joined {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                            </p>
                            <div className="flex items-center gap-2">
                              {user.status === 'suspended' || user.status === 'banned' ? (
                                <button 
                                  onClick={() => handleUpdateUserStatus(user.id, 'active')}
                                  className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase transition-all"
                                >
                                  Unblock
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleBanUser(user.id)}
                                  className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase transition-all"
                                >
                                  Block
                                </button>
                              )}
                              <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto scrollbar-hide">
                      <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">User</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Joined</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {users
                            .filter(u => 
                              u.full_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                              u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                              u.id.toString().includes(userSearchQuery)
                            )
                            .map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                    {user.avatar_url ? (
                                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <Users className="w-5 h-5 text-gray-400" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{user.full_name}</p>
                                    <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{user.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                                  user.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                                }`}>
                                  {user.role}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                                  user.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                }`}>
                                  {user.status || 'active'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-xs text-gray-500 font-medium">
                                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                                </p>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  {user.status === 'suspended' || user.status === 'banned' ? (
                                    <button 
                                      onClick={() => handleUpdateUserStatus(user.id, 'active')}
                                      className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                      title="Unblock User"
                                    >
                                      <CheckCircle2 className="w-5 h-5" />
                                    </button>
                                  ) : (
                                    <button 
                                      onClick={() => handleBanUser(user.id)}
                                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                      title="Block User"
                                    >
                                      <UserX className="w-5 h-5" />
                                    </button>
                                  )}
                                  <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-all">
                                    <MoreVertical className="w-5 h-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'ads' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">Ads Management</h2>
                  <p className="text-gray-500 font-medium text-sm">Promote listings to specific grid positions.</p>
                </div>
              </div>

              {/* Active Ads Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {localListings.filter(l => l.is_ad).map(ad => (
                  <div key={ad.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden group">
                    <div className="relative h-48">
                      <img src={ad.image} alt="" className="w-full h-full object-cover" />
                      <div className="absolute top-4 left-4">
                        <span className="bg-gray-900 text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-lg">
                          Active Ad
                        </span>
                      </div>
                      <div className="absolute top-4 right-4">
                        <button 
                          onClick={() => handleUpdateAd(ad.id, false, 0, 0)}
                          className="bg-white/90 backdrop-blur-md p-2 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <h4 className="font-bold text-gray-900 mb-1 line-clamp-1">{ad.title}</h4>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-emerald-600 font-black text-lg">Br {ad.price.toLocaleString()}</p>
                        <div className="flex gap-2">
                          <div className="bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter block">Row</span>
                            <span className="text-sm font-black text-gray-900">{ad.ad_row}</span>
                          </div>
                          <div className="bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter block">Col</span>
                            <span className="text-sm font-black text-gray-900">{ad.ad_col}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setAdModal({ isOpen: true, listing: ad, row: ad.ad_row || 1, col: ad.ad_col || 1 })}
                        className="w-full py-3 bg-gray-50 text-gray-600 rounded-2xl font-bold hover:bg-gray-100 transition-all border border-gray-100"
                      >
                        Change Position
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promote New Listing */}
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <h3 className="text-lg font-bold text-gray-900">Promote New Listing</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Search listings..." 
                        value={adSearchQuery}
                        onChange={(e) => setAdSearchQuery(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-1.5 text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                    <select 
                      value={adCategoryFilter}
                      onChange={(e) => setAdCategoryFilter(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="bg-white">
                  {/* Mobile Listing Cards for Ads */}
                  <div className="lg:hidden divide-y divide-gray-50">
                    {filteredAdsListings.slice(0, 10).map(listing => (
                      <div key={listing.id} className="p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <img src={listing.image} alt="" className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-black text-gray-900 truncate">{listing.title}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{listing.sellerName || 'Verified Seller'}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                          <p className="text-sm font-black text-emerald-600">Br {listing.price.toLocaleString()}</p>
                          <button 
                            onClick={() => setAdModal({ isOpen: true, listing, row: 1, col: 1 })}
                            className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-500 hover:text-white transition-all"
                          >
                            Promote
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Listing</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Seller</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Price</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredAdsListings.slice(0, 10).map(listing => (
                          <tr key={listing.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img src={listing.image} alt="" className="w-10 h-10 rounded-lg object-cover shadow-sm" />
                                <p className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{listing.title}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-600">{listing.sellerName || 'Verified Seller'}</td>
                            <td className="px-6 py-4 text-sm font-black text-gray-900">Br {listing.price.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => setAdModal({ isOpen: true, listing, row: 1, col: 1 })}
                                className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black uppercase hover:bg-emerald-500 hover:text-white transition-all"
                              >
                                Promote
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Report Detail Modal */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReport(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-md">Report Detail</span>
                    <span className="text-xs font-mono text-gray-400">ID: #{selectedReport.id}</span>
                  </div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Reviewing Violation</h2>
                </div>
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="p-2 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-gray-200"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                {/* Listing Section */}
                <section>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Reported Listing</h3>
                  <div className="flex gap-6 p-4 bg-gray-50 rounded-3xl border border-gray-100">
                    <img 
                      src={selectedReport.listing?.thumbnail_url || 'https://picsum.photos/seed/placeholder/200/200'} 
                      alt="" 
                      className="w-24 h-24 rounded-2xl object-cover shadow-md"
                    />
                    <div className="flex-1 min-w-0 py-1">
                      <h4 className="text-lg font-black text-gray-900 mb-1 truncate">{selectedReport.listing?.title}</h4>
                      <p className="text-emerald-600 font-bold text-sm mb-3">${selectedReport.listing?.price?.toLocaleString()}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          selectedReport.listing?.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {selectedReport.listing?.status}
                        </span>
                        <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                          ID: {selectedReport.listing_id}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Violation Section */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Violation Reason</h3>
                    <div className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl border border-red-100">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <span className="font-black text-red-700 uppercase tracking-tight">{selectedReport.reason}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Reported On</h3>
                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <Calendar className="w-5 h-5 text-blue-500" />
                      <span className="font-bold text-blue-700">
                        {new Date(selectedReport.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Details Section */}
                <section>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Reporter's Statement</h3>
                  <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm italic text-gray-600 leading-relaxed">
                    {selectedReport.details ? `"${selectedReport.details}"` : "No additional details provided by the reporter."}
                  </div>
                </section>

                {/* Reporter Info */}
                <section>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Reporter Information</h3>
                  <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-2xl">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 font-bold">
                      {selectedReport.reporter?.full_name?.charAt(0) || 'A'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{selectedReport.reporter?.full_name || 'Anonymous Reporter'}</p>
                      <p className="text-xs text-gray-500">{selectedReport.reporter?.email}</p>
                    </div>
                  </div>
                </section>
              </div>

              {/* Modal Footer */}
              <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Status:</span>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                    selectedReport.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                    selectedReport.status === 'resolved' ? 'bg-emerald-100 text-emerald-600' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {selectedReport.status}
                  </span>
                </div>
                <div className="flex gap-3">
                  {selectedReport.status === 'pending' ? (
                    <>
                      <button 
                        onClick={() => { handleReportAction(selectedReport, 'dismiss'); setSelectedReport(null); }}
                        className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
                      >
                        Dismiss
                      </button>
                      <button 
                        onClick={() => { handleReportAction(selectedReport, 'resolve'); setSelectedReport(null); }}
                        className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                      >
                        Resolve Report
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => setSelectedReport(null)}
                      className="px-8 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText="Confirm"
        cancelText="Cancel"
      />

      {adModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-xl font-black text-gray-900">Promote as Ad</h3>
              <button 
                onClick={() => setAdModal({ isOpen: false, listing: null, row: 1, col: 1 })}
                className="p-2 hover:bg-white rounded-xl transition-all"
              >
                <XCircle className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <img src={adModal.listing?.image} alt="" className="w-16 h-16 rounded-xl object-cover shadow-sm" />
                <div>
                  <p className="font-bold text-gray-900 line-clamp-1">{adModal.listing?.title}</p>
                  <p className="text-emerald-600 font-black">Br {adModal.listing?.price.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Target Row</label>
                  <input 
                    type="number" 
                    min="1"
                    value={adModal.row}
                    onChange={(e) => setAdModal(prev => ({ ...prev, row: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Target Column</label>
                  <input 
                    type="number" 
                    min="1"
                    value={adModal.col}
                    onChange={(e) => setAdModal(prev => ({ ...prev, col: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3">
                <div className="p-2 bg-blue-100 rounded-xl h-fit">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-xs text-blue-800 font-medium leading-relaxed">
                  The ad will be injected at Row {adModal.row}, Column {adModal.col} in the main listing grid. Regular listings will automatically shift to accommodate this slot.
                </p>
              </div>
            </div>
            <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex gap-3">
              <button 
                onClick={() => setAdModal({ isOpen: false, listing: null, row: 1, col: 1 })}
                className="flex-1 px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => adModal.listing && handleUpdateAd(adModal.listing.id, true, adModal.row, adModal.col)}
                className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
              >
                Confirm Ad
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
