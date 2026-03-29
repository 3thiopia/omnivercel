import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, X, Phone, Loader2, CheckCircle2, ChevronDown } from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'react-hot-toast';
import { ETHIOPIAN_LOCATIONS } from '../constants/locations';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (phone: string, location: string) => void;
  initialPhone?: string;
  initialLocation?: string;
}

export const ProfileCompletionModal = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  initialPhone = '',
  initialLocation = ''
}: ProfileCompletionModalProps) => {
  const [phone, setPhone] = useState(initialPhone);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedSubRegion, setSelectedSubRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Update local state when initial values change or modal opens
  useEffect(() => {
    if (isOpen) {
      setPhone(initialPhone);
      
      if (initialLocation) {
        if (initialLocation.includes(', ')) {
          const [region, subRegion] = initialLocation.split(', ');
          setSelectedRegion(region);
          setSelectedSubRegion(subRegion);
        } else {
          setSelectedRegion(initialLocation);
          setSelectedSubRegion('');
        }
      } else {
        setSelectedRegion('');
        setSelectedSubRegion('');
      }
    }
  }, [isOpen, initialPhone, initialLocation]);

  const isConfirming = initialPhone && initialLocation;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 9) {
      toast.error('Please enter a valid phone number');
      return;
    }
    if (!selectedRegion) {
      toast.error('Please select a region');
      return;
    }

    const locationString = selectedSubRegion 
      ? `${selectedRegion}, ${selectedSubRegion}` 
      : selectedRegion;

    setLoading(true);
    try {
      // Update user profile with phone and location
      await api.users.updateMe({ phone, location: locationString }, '');
      setSuccess(true);
      setTimeout(() => {
        onSuccess(phone, locationString);
        onClose();
        setSuccess(false);
        setPhone('');
        setSelectedRegion('');
        setSelectedSubRegion('');
      }, 1500);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to save profile information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative bg-white w-full h-full sm:h-auto sm:max-w-md sm:rounded-[2.5rem] shadow-2xl overflow-hidden p-8 pb-[calc(2rem+env(safe-area-inset-bottom))]"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>

            {success ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-500 mx-auto">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-black text-gray-900">Verified!</h3>
                <p className="text-gray-500 font-medium">Your profile information has been saved.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-500 mx-auto mb-4">
                    <Phone className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                    {isConfirming ? 'Confirm Your Details' : 'Complete Your Profile'}
                  </h2>
                  <p className="text-gray-500 font-medium text-sm">
                    {isConfirming 
                      ? 'Please confirm your contact details are correct so buyers can reach you.'
                      : 'Please enter your phone number and location to continue posting your ad.'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                      type="tel"
                      required
                      placeholder="Phone Number (e.g. 0912345678)"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl outline-none transition-all font-medium text-base sm:text-sm"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="relative group">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                      <select
                        required
                        className="w-full pl-12 pr-10 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl outline-none transition-all font-medium appearance-none cursor-pointer text-base sm:text-sm"
                        value={selectedRegion}
                        onChange={(e) => {
                          setSelectedRegion(e.target.value);
                          setSelectedSubRegion('');
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
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>

                    {selectedRegion && ETHIOPIAN_LOCATIONS.find(l => l.name === selectedRegion)?.subRegions && (
                      <div className="relative group">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                        <select
                          required
                          className="w-full pl-12 pr-10 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl outline-none transition-all font-medium appearance-none cursor-pointer text-base sm:text-sm"
                          value={selectedSubRegion}
                          onChange={(e) => setSelectedSubRegion(e.target.value)}
                        >
                          <option value="">Select Sub-Region / City</option>
                          {ETHIOPIAN_LOCATIONS.find(l => l.name === selectedRegion)?.subRegions?.map((sub) => (
                            <option key={sub} value={sub}>
                              {sub}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/30 hover:bg-emerald-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <span>{isConfirming ? 'CONFIRM & CONTINUE' : 'SAVE & CONTINUE'}</span>
                    )}
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
