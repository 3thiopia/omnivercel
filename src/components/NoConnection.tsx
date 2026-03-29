import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

export const NoConnection: React.FC = () => {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-sm w-full space-y-8"
      >
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-red-50 rounded-full animate-ping opacity-20" />
          <div className="relative bg-red-50 w-24 h-24 rounded-full flex items-center justify-center">
            <WifiOff className="w-12 h-12 text-red-500" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">No Connection</h1>
          <p className="text-gray-500 font-medium leading-relaxed">
            It seems you're offline. Please check your internet connection and try again.
          </p>
        </div>

        <div className="pt-4">
          <button
            onClick={handleRetry}
            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-gray-900/10"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
        </div>

        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
          Waiting for network...
        </p>
      </motion.div>
    </div>
  );
};
