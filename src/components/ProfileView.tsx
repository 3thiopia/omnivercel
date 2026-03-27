import { useState, useEffect, ChangeEvent } from 'react';
import { User, Phone, Mail, Camera, Loader2, CheckCircle2, AlertCircle, LogOut, ArrowLeft, Trash2, MapPin, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, UserProfile } from '../services/api';
import { supabase } from '../lib/supabase';
import { getOptimizedImageUrl } from '../lib/imageUtils';
import { ConfirmationModal } from './ConfirmationModal';
import { ETHIOPIAN_LOCATIONS } from '../constants/locations';

interface ProfileViewProps {
  user: any;
  onLogout: () => void;
  onLogoutSuccess: () => void;
  onBack: () => void;
  onAdminClick?: () => void;
}

const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(50, 'Full name too long'),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number format').optional().or(z.literal('')),
  region: z.string().min(1, 'Region is required'),
  subRegion: z.string().min(1, 'Sub-region is required'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const ProfileView = ({ user, onLogout, onLogoutSuccess, onBack, onAdminClick }: ProfileViewProps) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const formData = watch();

  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('You must be logged in to view your profile.');
        return;
      }

      const data = await api.users.getMe(session.access_token);
      setProfile(data);
      setAvatarUrl(data.avatar_url || '');
      
      let region = '';
      let subRegion = '';

      if (data.location) {
        if (data.location.includes(', ')) {
          [region, subRegion] = data.location.split(', ');
        } else {
          region = data.location;
        }
      }

      reset({
        fullName: data.full_name || '',
        phone: data.phone || '',
        region: region,
        subRegion: subRegion,
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB.');
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Unauthorized');

      const updatedProfile = await api.users.uploadAvatar(file, session.access_token);
      setProfile(updatedProfile);
      setAvatarUrl(updatedProfile.avatar_url || '');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError('Failed to upload profile picture. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateProfile = async (data: ProfileFormData) => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Unauthorized');

      const locationString = data.subRegion 
        ? `${data.region}, ${data.subRegion}` 
        : data.region;

      const updatedProfile = await api.users.updateMe({
        full_name: data.fullName,
        phone: data.phone,
        location: locationString
      }, session.access_token);

      setProfile(updatedProfile);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Unauthorized');

      await api.users.deleteMe(session.access_token);
      await supabase.auth.signOut();
      onLogoutSuccess();
    } catch (err) {
      console.error('Error deleting account:', err);
      setError('Failed to delete account. Please try again.');
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-32">
      {/* Mobile Sticky Header - Hidden on Desktop to prevent overlapping */}
      <header 
        className={`fixed top-0 left-0 right-0 z-[100] lg:hidden transition-all duration-300 px-4 py-3 flex items-center justify-between ${
          isScrolled ? 'bg-white/80 backdrop-blur-xl shadow-sm' : 'bg-transparent'
        }`}
      >
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className={`p-2 rounded-2xl transition-all ${
              isScrolled ? 'bg-gray-100 text-gray-900' : 'bg-white/20 backdrop-blur-md text-white'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className={`text-lg font-black tracking-tight transition-all ${
            isScrolled ? 'opacity-100 text-gray-900' : 'opacity-0'
          }`}>
            Profile
          </h1>
        </div>
        <button 
          onClick={onLogout}
          className={`p-2 rounded-2xl transition-all ${
            isScrolled ? 'bg-red-50 text-red-500' : 'bg-white/20 backdrop-blur-md text-white'
          }`}
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Desktop Header - Visible only on Desktop */}
      <div className="hidden lg:flex items-center justify-between max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-2xl transition-all text-gray-900"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Account Settings</h1>
            <p className="text-gray-500 text-sm font-medium">Manage your personal information</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-2xl transition-all"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>

      {/* Hero Section */}
      <div className="relative h-72 sm:h-80 bg-emerald-500 overflow-hidden lg:rounded-[3rem] lg:max-w-4xl lg:mx-auto lg:mt-4">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
          <div className="relative group">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-[2.5rem] bg-white p-1 shadow-2xl">
              <div className="w-full h-full rounded-[2.3rem] overflow-hidden bg-gray-100 relative">
                {isUploading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  </div>
                ) : avatarUrl ? (
                  <img 
                    src={getOptimizedImageUrl(avatarUrl, { width: 300, height: 300 })} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <User className="w-12 h-12" />
                  </div>
                )}
              </div>
            </div>
            <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-2xl shadow-xl flex items-center justify-center text-emerald-500 hover:scale-110 transition-all cursor-pointer border border-gray-100 z-20">
              <Camera className="w-5 h-5" />
              <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={isUploading}
              />
            </label>
          </div>
          <h2 className="mt-4 text-2xl font-black text-white tracking-tight">{formData.fullName || 'Your Name'}</h2>
          <p className="text-emerald-100 text-sm font-medium">{profile?.email}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-10 relative z-10">
        <form onSubmit={handleSubmit(handleUpdateProfile)} className="space-y-6">
          {(error || Object.keys(errors).length > 0) && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 text-red-600 p-4 rounded-3xl flex flex-col gap-2 text-sm font-bold border border-red-100"
            >
              {error && (
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </div>
              )}
              {Object.entries(errors).map(([field, err]) => (
                <div key={field} className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="capitalize">{field}:</span> {err?.message as string}
                </div>
              ))}
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50 text-emerald-600 p-4 rounded-3xl flex items-center gap-3 text-sm font-bold border border-emerald-100"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              Profile updated successfully!
            </motion.div>
          )}

          {/* Personal Info Section */}
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                <User className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Personal Info</h3>
            </div>

            <div className="grid gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative group">
                  <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${errors.fullName ? 'text-red-500' : 'text-gray-400 group-focus-within:text-emerald-500'}`} />
                  <input 
                    type="text"
                    {...register('fullName')}
                    placeholder="Enter your full name"
                    className={`w-full bg-gray-50 border-2 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all ${errors.fullName ? 'border-red-500 bg-red-50' : 'border-transparent'}`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                <div className="relative group">
                  <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${errors.phone ? 'text-red-500' : 'text-gray-400 group-focus-within:text-emerald-500'}`} />
                  <input 
                    type="tel"
                    {...register('phone')}
                    placeholder="Enter your phone number"
                    className={`w-full bg-gray-50 border-2 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all ${errors.phone ? 'border-red-500 bg-red-50' : 'border-transparent'}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                <MapPin className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Location</h3>
            </div>

            <div className="grid gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Region</label>
                <div className="relative group">
                  <MapPin className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${errors.region ? 'text-red-500' : 'text-gray-400 group-focus-within:text-emerald-500'}`} />
                  <select
                    className={`w-full pl-12 pr-10 py-4 bg-gray-50 border-2 rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all appearance-none cursor-pointer ${errors.region ? 'border-red-500 bg-red-50' : 'border-transparent'}`}
                    value={formData.region}
                    onChange={(e) => {
                      setValue('region', e.target.value, { shouldValidate: true });
                      setValue('subRegion', '', { shouldValidate: true });
                    }}
                  >
                    <option value="">Select Region</option>
                    {ETHIOPIAN_LOCATIONS.map((loc) => (
                      <option key={loc.name} value={loc.name}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {formData.region && ETHIOPIAN_LOCATIONS.find(l => l.name === formData.region)?.subRegions && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sub-Region / City</label>
                  <div className="relative group">
                    <MapPin className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${errors.subRegion ? 'text-red-500' : 'text-gray-400 group-focus-within:text-emerald-500'}`} />
                    <select
                      className={`w-full pl-12 pr-10 py-4 bg-gray-50 border-2 rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all appearance-none cursor-pointer ${errors.subRegion ? 'border-red-500 bg-red-50' : 'border-transparent'}`}
                      value={formData.subRegion}
                      onChange={(e) => setValue('subRegion', e.target.value, { shouldValidate: true })}
                    >
                      <option value="">Select Sub-Region / City</option>
                      {ETHIOPIAN_LOCATIONS.find(l => l.name === formData.region)?.subRegions?.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Account Security Section */}
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Mail className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Account Security</h3>
            </div>

            <div className="space-y-2 opacity-60">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address (Read-only)</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full bg-gray-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSaving}
            className="w-full bg-emerald-500 text-white py-5 rounded-3xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Updating...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </form>

        {/* Admin Section */}
        {profile?.role === 'admin' && onAdminClick && (
          <div className="mt-8 p-8 bg-emerald-50/50 rounded-[2.5rem] border border-emerald-100 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-emerald-900 uppercase tracking-widest">Management</h3>
            </div>
            
            <p className="text-xs text-emerald-600/70 font-bold leading-relaxed">
              Access the administrative dashboard to manage listings, users, and system reports.
            </p>
            
            <button 
              onClick={onAdminClick}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-white text-emerald-600 font-black uppercase tracking-widest hover:bg-emerald-50 transition-all active:scale-[0.98] border border-emerald-100 shadow-sm shadow-emerald-500/5"
            >
              <ShieldCheck className="w-5 h-5" />
              Open Admin Panel
            </button>
          </div>
        )}

        {/* Danger Zone */}
        <div className="mt-12 mb-20 p-8 bg-red-50/50 rounded-[2.5rem] border border-red-100 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
              <Trash2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black text-red-900 uppercase tracking-widest">Danger Zone</h3>
          </div>
          
          <p className="text-xs text-red-600/70 font-bold leading-relaxed">
            Once you delete your account, there is no going back. All your listings, messages, and profile data will be permanently removed.
          </p>
          
          <button 
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-white text-red-500 font-black uppercase tracking-widest hover:bg-red-50 transition-all active:scale-[0.98] border border-red-100 shadow-sm shadow-red-500/5"
          >
            <Trash2 className="w-5 h-5" />
            Delete My Account
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="Are you absolutely sure you want to delete your account? This action is irreversible and all your listings, messages, and profile data will be permanently removed."
        confirmText="Yes, Delete My Account"
        cancelText="No, Keep My Account"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
