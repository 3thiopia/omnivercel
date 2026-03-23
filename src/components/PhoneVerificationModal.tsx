import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'react-hot-toast';

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (phone: string) => void;
}

export const PhoneVerificationModal = ({ isOpen, onClose, onSuccess }: PhoneVerificationModalProps) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 9) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      // Update user profile with phone number
      await api.users.updateMe({ phone }, '');
      setSuccess(true);
      setTimeout(() => {
        onSuccess(phone);
        onClose();
        setSuccess(false);
        setPhone('');
      }, 1500);
    } catch (error) {
      console.error('Error updating phone:', error);
      toast.error('Failed to save phone number. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
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
                <p className="text-gray-500 font-medium">Your phone number has been saved.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-500 mx-auto mb-4">
                    <Phone className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Phone Verification</h2>
                  <p className="text-gray-500 font-medium text-sm">
                    Please enter your phone number to continue posting your ad. This helps buyers reach you easily.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 0912345678"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/30 hover:bg-emerald-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <span>SAVE & CONTINUE</span>
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
