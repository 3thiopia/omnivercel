import { useState, useEffect, useRef, ImgHTMLAttributes, HTMLAttributeReferrerPolicy } from 'react';

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
  referrerPolicy?: HTMLAttributeReferrerPolicy;
  withWatermark?: boolean;
}

export const LazyImage = ({ 
  src, 
  alt, 
  className, 
  fallbackSrc,
  withWatermark = true, // Default to true for product images
  ...props 
}: LazyImageProps) => {
  const [isInView, setIsInView] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [processedSrc, setProcessedSrc] = useState<string | undefined>(undefined);
  const imgRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  useEffect(() => {
    if (!isInView || !src || !withWatermark) {
      setProcessedSrc(src);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setProcessedSrc(src);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const fontSize = Math.max(20, Math.floor(img.width / 15));
      ctx.font = `900 ${fontSize}px "Inter", sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';

      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      const padding = fontSize / 2;
      ctx.fillText("Omni Market", img.width - padding, img.height - padding);

      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setProcessedSrc(dataUrl);
      } catch (err) {
        console.error("Watermarking failed:", err);
        setProcessedSrc(src);
      }
    };

    img.onerror = () => {
      setProcessedSrc(src);
    };
  }, [isInView, src, withWatermark]);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden bg-gray-100/50 ${className}`}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      )}
      
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-gray-50">
          <div className="text-gray-300 mb-1">
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">No Image</span>
        </div>
      ) : (
        isInView && processedSrc && (
          <img
            src={processedSrc}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            className={`w-full h-full object-cover transition-all duration-700 ease-out ${
              isLoading ? 'opacity-0 scale-105 blur-lg' : 'opacity-100 scale-100 blur-0'
            }`}
            {...props}
          />
        )
      )}
    </div>
  );
};
