import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export const useAnalytics = () => {
  const location = useLocation();
  const GA_ID = import.meta.env.VITE_GA_ID;

  useEffect(() => {
    if (!GA_ID || !window.gtag) return;

    window.gtag('config', GA_ID, {
      page_path: location.pathname + location.search,
    });
  }, [location, GA_ID]);
};
