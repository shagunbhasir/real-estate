import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback, memo } from "react";
import { normalizeImageArray } from "@/utils/imageUtils";
import { rafThrottle } from "@/utils/rafThrottle";

interface ImageGalleryModalProps {
  images: string[] | string | undefined;
  isOpen: boolean;
  onClose: () => void;
  initialImageIndex?: number;
}

// Simple image component with error handling
const SafeImage = memo(({ src, alt, className }: { 
  src: string; 
  alt: string; 
  className?: string;
}) => {
  const [error, setError] = useState(false);
  
  if (error || !src) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 ${className}`}>
        <span className="text-gray-500 text-sm">Image unavailable</span>
      </div>
    );
  }
  
  return (
    <img 
      src={src} 
      alt={alt} 
      className={className} 
      onError={() => {
        console.error("Image failed to load:", src);
        setError(true);
      }}
    />
  );
});

SafeImage.displayName = 'SafeImage';

// Thumbnail component
const ImageThumbnail = memo(({ 
  src, 
  index, 
  isActive, 
  onClick 
}: {
  src: string;
  index: number;
  isActive: boolean;
  onClick: (e: React.MouseEvent) => void;
}) => (
  <div
    onClick={onClick}
    className={`
      w-16 h-16 cursor-pointer border-2 transition-all
      ${isActive ? 'border-blue-500' : 'border-transparent'}
    `}
  >
    <SafeImage
      src={src}
      alt={`Thumbnail ${index + 1}`}
      className="w-full h-full object-cover"
    />
  </div>
));

ImageThumbnail.displayName = 'ImageThumbnail';

const ImageGalleryModalFixed: React.FC<ImageGalleryModalProps> = ({ 
  images, 
  isOpen, 
  onClose, 
  initialImageIndex = 0 
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialImageIndex);
  
  // Debug logs for images
  useEffect(() => {
    if (isOpen) {
      console.log('ImageGalleryModal received images:', images);
      console.log('Raw images type:', typeof images, Array.isArray(images));
      if (Array.isArray(images)) {
        console.log('Images array length:', images.length);
        console.log('Images array content:', images);
      }
    }
  }, [isOpen, images]);
  
  // Normalize images array for consistency
  const filteredImages = normalizeImageArray(images);
  
  // More debugging for normalized images
  useEffect(() => {
    if (isOpen) {
      console.log('Normalized filteredImages:', filteredImages);
      console.log('Filtered images length:', filteredImages.length);
    }
  }, [isOpen, filteredImages]);
  
  // Image navigation handler
  const navigateImages = useCallback((direction: 'next' | 'prev') => {
    setCurrentIndex(prevIndex => {
      if (direction === 'next') {
        return prevIndex === filteredImages.length - 1 ? 0 : prevIndex + 1;
      } else {
        return prevIndex === 0 ? filteredImages.length - 1 : prevIndex - 1;
      }
    });
  }, [filteredImages.length]);
  
  // Thumbnail click handler
  const handleThumbnailClick = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);
  
  // Close on backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    // Only close if clicking directly on the backdrop, not on its children
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Throttled version of backdrop click handler
  const throttledBackdropClick = rafThrottle(handleBackdropClick);
  
  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          navigateImages('prev');
          break;
        case 'ArrowRight':
          navigateImages('next');
          break;
        case 'Escape':
          onClose();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, navigateImages, onClose]);
  
  // Early return if no images or modal not open
  if (!isOpen || filteredImages.length === 0) {
    return null;
  }
  
  // Current image src
  const currentImageSrc = filteredImages[currentIndex];
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
      onClick={throttledBackdropClick}
    >
      <div 
        className="relative max-w-5xl w-full p-4 mx-4 bg-white rounded-lg shadow-xl" 
        onClick={e => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-10 rounded-full bg-white"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>
        
        {/* Main image */}
        <div className="relative h-[60vh] w-full">
          <SafeImage
            src={currentImageSrc}
            alt={`Image ${currentIndex + 1} of ${filteredImages.length}`}
            className="w-full h-full object-contain"
          />
          
          {/* Navigation buttons */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full"
            onClick={() => navigateImages('prev')}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full"
            onClick={() => navigateImages('next')}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </div>
        
        {/* Thumbnails */}
        {filteredImages.length > 1 && (
          <div className="flex overflow-x-auto gap-2 mt-4 p-2">
            {filteredImages.map((image, index) => (
              <ImageThumbnail
                key={index}
                src={image}
                index={index}
                isActive={index === currentIndex}
                onClick={() => handleThumbnailClick(index)}
              />
            ))}
          </div>
        )}
        
        {/* Image counter */}
        <div className="absolute left-4 top-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm">
          {currentIndex + 1} / {filteredImages.length}
        </div>
      </div>
    </div>
  );
};

export default ImageGalleryModalFixed; 