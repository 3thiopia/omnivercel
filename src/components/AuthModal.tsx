import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, LogIn, UserPlus, AlertCircle, MapPin, Phone, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { ETHIOPIAN_LOCATIONS } from '../constants/locations';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal = ({ isOpen, onClose, onSuccess }: AuthModalProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<'password' | 'magic_link'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedSubRegion, setSelectedSubRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVerificationInfo, setShowVerificationInfo] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        if (authMethod === 'magic_link') {
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: window.location.origin,
            },
          });
          if (error) throw error;
          setShowVerificationInfo(true);
          return;
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
        }
      } else {
        const locationString = selectedSubRegion 
          ? `${selectedRegion}, ${selectedSubRegion}` 
          : selectedRegion;

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone,
              location: locationString,
            },
          },
        });
        if (error) throw error;
        setShowVerificationInfo(true);
        return; // Don't close yet, show info
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowVerificationInfo(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center lg:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm hidden lg:block"
          />
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative bg-white w-full h-full lg:h-auto lg:max-w-md lg:rounded-[2.5rem] shadow-2xl overflow-y-auto no-scrollbar pb-[env(safe-area-inset-bottom)]"
          >
            {showVerificationInfo ? (
              <div className="p-8 h-full flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center text-emerald-600 mb-4">
                  <Mail className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                  {authMethod === 'magic_link' ? 'Check Your Email' : 'Verify Your Email'}
                </h2>
                <p className="text-gray-500 font-medium leading-relaxed">
                  {authMethod === 'magic_link' 
                    ? <>We've sent a magic link to <span className="text-emerald-600 font-bold">{email}</span>. Click the link in the email to log in instantly.</>
                    : <>We've sent a verification link to <span className="text-emerald-600 font-bold">{email}</span>. Please check your inbox and click the link to activate your account.</>
                  }
                </p>
                {!isLogin && (
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-amber-700 text-sm font-medium">
                    Note: You won't be able to log in until your email is verified.
                  </div>
                )}
                <button
                  onClick={handleClose}
                  className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                >
                  Got it!
                </button>
              </div>
            ) : (
              <div className="p-6 lg:p-8">
                <div className="flex justify-between items-center mb-8 sticky top-0 bg-white z-10 py-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleClose}
                      className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-6 h-6 text-gray-400" />
                    </button>
                    <div>
                      <h2 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">
                        {isLogin ? 'Welcome Back' : 'Join Omni Market'}
                      </h2>
                      <p className="text-gray-500 text-sm font-medium">
                        {isLogin ? 'Log in to manage your ads' : 'Create an account to start selling'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="hidden lg:block p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {!isLogin && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                        <div className="relative group">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                          <input
                            type="text"
                            name="name"
                            autoComplete="name"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl py-4 pl-12 pr-4 outline-none transition-all font-bold text-base sm:text-sm"
                            placeholder="John Doe"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                        <div className="relative group">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                          <input
                            type="tel"
                            name="tel"
                            autoComplete="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl py-4 pl-12 pr-4 outline-none transition-all font-bold text-base sm:text-sm"
                            placeholder="e.g. 0912345678"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Region</label>
                        <div className="relative group">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                          <select
                            required
                            className="w-full pl-12 pr-10 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-base sm:text-sm appearance-none cursor-pointer"
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
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {selectedRegion && ETHIOPIAN_LOCATIONS.find(l => l.name === selectedRegion)?.subRegions && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sub-Region / City</label>
                          <div className="relative group">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                            <select
                              required
                              className="w-full pl-12 pr-10 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-base sm:text-sm appearance-none cursor-pointer"
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
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                      <input
                        type="email"
                        name="email"
                        autoComplete="username"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl py-4 pl-12 pr-4 outline-none transition-all font-bold text-base sm:text-sm"
                        placeholder="name@example.com"
                      />
                    </div>
                  </div>

                  {isLogin && (
                    <div className="flex bg-gray-50 p-1 rounded-2xl mb-2">
                      <button
                        type="button"
                        onClick={() => setAuthMethod('password')}
                        className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                          authMethod === 'password' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        Password
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthMethod('magic_link')}
                        className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                          authMethod === 'magic_link' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        Magic Link
                      </button>
                    </div>
                  )}

                  {(!isLogin || authMethod === 'password') && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                          <input
                            type="password"
                            name="password"
                            autoComplete={isLogin ? "current-password" : "new-password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl py-4 pl-12 pr-4 outline-none transition-all font-bold text-base sm:text-sm"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                      
                      {isLogin && (
                        <div className="flex items-center justify-between px-1">
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <div className="relative flex items-center">
                              <input 
                                type="checkbox" 
                                className="peer sr-only" 
                                defaultChecked 
                              />
                              <div className="w-5 h-5 border-2 border-gray-200 rounded-lg peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all"></div>
                              <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity left-0.5" />
                            </div>
                            <span className="text-xs font-bold text-gray-500 group-hover:text-gray-700 transition-colors">Remember me</span>
                          </label>
                          <button 
                            type="button"
                            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                            onClick={() => toast.error('Password reset is coming soon!')}
                          >
                            Forgot Password?
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-500 text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100 mt-4"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        {isLogin ? (
                          authMethod === 'magic_link' ? <Mail className="w-5 h-5" /> : <LogIn className="w-5 h-5" />
                        ) : (
                          <UserPlus className="w-5 h-5" />
                        )}
                        <span>
                          {isLogin 
                            ? (authMethod === 'magic_link' ? 'Send Magic Link' : 'Log In') 
                            : 'Create Account'}
                        </span>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8">
                  <div className="relative mb-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-100"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase">
                      <span className="bg-white px-4 text-gray-400 font-black tracking-[0.2em]">Or continue with</span>
                    </div>
                  </div>

                  <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-white border-2 border-gray-100 text-gray-700 py-4 rounded-3xl font-bold hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:scale-100"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span>Google</span>
                  </button>
                </div>

                <div className="mt-10 text-center pb-8">
                  <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-gray-500 font-bold hover:text-emerald-600 transition-colors text-sm"
                  >
                    {isLogin ? "Don't have an account? Register" : 'Already have an account? Log In'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
