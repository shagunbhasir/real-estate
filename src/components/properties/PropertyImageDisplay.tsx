import { useState, useEffect } from 'react';
import { getOptimizedImageUrl } from '@/utils/imageUtils';

interface PropertyImageDisplayProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}

export function PropertyImageDisplay({ 
  src, 
  alt, 
  className = "", 
  onClick 
}: PropertyImageDisplayProps) {
  const [imgSrc, setImgSrc] = useState<string>("");
  const [error, setError] = useState(false);
  
  useEffect(() => {
    if (!src) {
      setError(true);
      return;
    }
    
    try {
      console.log("Processing image URL:", src);
      const optimizedUrl = getOptimizedImageUrl(src);
      console.log("Optimized URL:", optimizedUrl);
      setImgSrc(optimizedUrl);
      setError(false);
    } catch (e) {
      console.error("Error processing image URL:", e);
      setError(true);
      setImgSrc(src); // Fallback to original
    }
  }, [src]);
  
  if (error || !imgSrc) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-200 ${className}`}
        onClick={onClick}
      >
        <span className="text-gray-500 text-sm">Image unavailable</span>
      </div>
    );
  }
  
  return (
    <img 
      src={imgSrc} 
      alt={alt} 
      className={className} 
      onClick={onClick}
      onError={() => {
        console.error("Image failed to load:", imgSrc);
        setError(true);
      }}
    />
  );
} 