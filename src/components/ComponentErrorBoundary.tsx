import React from 'react';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { AlertCircle, RefreshCw } from 'lucide-react';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-center">
      <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
      <p className="text-sm font-bold text-red-900 mb-1">Component Failed</p>
      <p className="text-xs text-red-600 mb-3 truncate">{(error as Error).message}</p>
      <button
        onClick={resetErrorBoundary}
        className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 flex items-center gap-1 mx-auto"
      >
        <RefreshCw className="w-3 h-3" />
        Retry
      </button>
    </div>
  );
}

export function ComponentErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ErrorBoundary>
  );
}
