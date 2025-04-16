import React, { useState, memo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Expand, Bed, Bath, Square, Heart } from "lucide-react";

// Import utility functions
import { normalizeImageArray, getOptimizedImageUrl } from "@/utils/imageUtils";
import { formatPriceDisplay } from "@/utils/filterUtils";
import ImageGalleryModal from "../properties/ImageGalleryModal";

export interface PropertyCardProps {
  id?: string;
  type: "sale" | "rent";
  title: string;
  address: string;
  price: number | string;
  beds: number;
  baths: number;
  sqft: number;
  imageUrl: string;
  allImages?: string[];
}

// Memoized PropertyInfo component for better performance
const PropertyInfo = memo(({ title, address }: { title: string; address: string }) => (
  <div className="flex flex-col">
    <h3 className="font-semibold text-lg truncate">{title}</h3>
    <p className="text-gray-500 text-sm truncate">{address}</p>
  </div>
));

PropertyInfo.displayName = 'PropertyInfo';

// Memoized PropertyFeatures component
const PropertyFeatures = memo(({ beds, baths, sqft }: { beds: number; baths: number; sqft: number }) => (
  <div className="flex items-center justify-between text-sm text-gray-600 pt-3">
    <div className="flex items-center">
      <Bed className="h-4 w-4 mr-1" />
      <span>{beds} bed{beds !== 1 ? 's' : ''}</span>
    </div>
    <div className="flex items-center">
      <Bath className="h-4 w-4 mr-1" />
      <span>{baths} bath{baths !== 1 ? 's' : ''}</span>
    </div>
    <div className="flex items-center">
      <Square className="h-4 w-4 mr-1" />
      <span>{sqft} sqft</span>
    </div>
  </div>
));

PropertyFeatures.displayName = 'PropertyFeatures';

// Main Property Card component
const PropertyCard: React.FC<PropertyCardProps> = ({
  id,
  type,
  title,
  address,
  price,
  beds,
  baths,
  sqft,
  imageUrl,
  allImages = [],
}) => {
  const [showGallery, setShowGallery] = useState(false);
  const [favorite, setFavorite] = useState(false);

  // Normalize images array for consistency
  const images = normalizeImageArray(allImages);
  // Use first available image or provided imageUrl
  const optimizedImageUrl = getOptimizedImageUrl(imageUrl || (images.length > 0 ? images[0] : undefined));

  // Memoized event handlers
  const handleImageClick = useCallback((e: React.MouseEvent) => {
    // Only open gallery if there are multiple images
    if (images.length > 1) {
      e.preventDefault();
      e.stopPropagation();
      setShowGallery(true);
    }
  }, [images.length]);

  const handleGalleryClose = useCallback(() => {
    setShowGallery(false);
  }, []);

  const toggleFavorite = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorite(prev => !prev);
  }, []);

  // Card content to display with or without Link wrapper
  const CardContent = () => (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg h-full">
      <div className="relative">
        {/* Property image */}
        <div className="relative aspect-video overflow-hidden">
          <img
            src={optimizedImageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
            onClick={handleImageClick}
          />
          
          {images.length > 1 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute bottom-2 right-2 bg-black/60 text-white p-1 rounded-full"
              onClick={handleImageClick}
            >
              <Expand className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className={`absolute top-2 right-2 rounded-full bg-white/70 hover:bg-white/90 ${favorite ? 'text-red-500' : 'text-gray-600'}`}
            onClick={toggleFavorite}
          >
            <Heart className={`h-5 w-5 ${favorite ? 'fill-current' : ''}`} />
          </Button>
        </div>
        
        {/* Property type badge */}
        <Badge 
          className={`absolute top-2 left-2 ${type === 'sale' ? 'bg-blue-600' : 'bg-green-600'}`}
        >
          {type === 'sale' ? 'For Sale' : 'For Rent'}
        </Badge>
      </div>
      
      <div className="p-4">
        {/* Property price */}
        <div className="text-xl font-bold mb-2">
          {typeof price === 'number' ? formatPriceDisplay(price) : price}
        </div>
        
        {/* Property information */}
        <PropertyInfo title={title} address={address} />
        
        {/* Property features */}
        <PropertyFeatures beds={beds} baths={baths} sqft={sqft} />
      </div>
      
      {/* Image gallery */}
      {showGallery && (
        <ImageGalleryModal
          images={images}
          isOpen={showGallery}
          onClose={handleGalleryClose}
        />
      )}
    </Card>
  );

  // Wrap card in link if id is provided, otherwise just show card
  if (id) {
    return (
      <Link to={`/property/${id}`} className="block h-full">
        <CardContent />
      </Link>
    );
  }

  return <CardContent />;
};

export default memo(PropertyCard);
