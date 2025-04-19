/**
 * Image utility functions for handling and optimizing images
 */

/**
 * Normalizes an image array to handle various formats
 * - Ensures null/undefined are handled as empty arrays
 * - Converts a single string to an array
 * - Filters out invalid (empty) entries
 * - Removes duplicate images
 * - Handles Supabase quirks where arrays might be string representations
 */
export function normalizeImageArray(images: any): string[] {
  if (!images) return [];

  let imagesArray: string[] = [];

  try {
    // Handle various input types
    if (typeof images === 'string') {
      // Handle potential Supabase string array format like {"url1","url2"}
      if (images.startsWith('{') && images.endsWith('}')) {
        imagesArray = images.slice(1, -1).split(',').map(img => img.trim().replace(/^"|"$/g, '')); // Remove {} and quotes
      } else {
        // Try to parse if it's a standard JSON string representation of an array
        try {
          const parsed = JSON.parse(images);
          if (Array.isArray(parsed)) {
            imagesArray = parsed;
          } else {
            // Single string URL if not JSON array
            imagesArray = [images];
          }
        } catch {
          // Not JSON, treat as a single URL
          imagesArray = [images];
        }
      }
    } else if (Array.isArray(images)) {
      // Already an array of image URLs
      imagesArray = images;
    } else if (typeof images === 'object' && images !== null) {
      // Sometimes Supabase returns objects with array-like structure
      try {
        imagesArray = Object.values(images).filter(value => typeof value === 'string');
      } catch (e) {
        console.error("Failed to parse object as image array:", e);
      }
    }

    // Get unique, non-empty images and validate URLs
    const uniqueImages = Array.from(new Set(
      imagesArray
        .filter(img => {
          if (!img || typeof img !== 'string' || img.trim() === '') {
            return false;
          }

          // Basic URL validation (not perfect but catches many issues)
          if (img.startsWith('http://') || img.startsWith('https://')) {
            return true;
          }

          // Allow relative URLs
          if (img.startsWith('/')) {
            return true;
          }

          // Log invalid URLs for debugging
          console.warn("Filtered out invalid image URL:", img);
          return false;
        })
        .map(img => img.trim())
    ));

    console.log("normalizeImageArray input:", images);
    console.log("normalizeImageArray output:", uniqueImages);

    return uniqueImages;
  } catch (error) {
    console.error("Error in normalizeImageArray:", error);
    return [];
  }
}

/**
 * Gets an optimized image URL for display
 * - Returns placeholder if image is missing
 * - Can process Supabase storage URLs
 */
export function getOptimizedImageUrl(
  imageUrl: string | undefined | null,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    placeholder?: string;
  } = {}
): string {
  const {
    width = 800,
    height,
    quality = 80,
    placeholder = "/images/property-placeholder.jpg"
  } = options;

  // Return placeholder for missing images
  if (!imageUrl) return placeholder;

  // For Supabase storage URLs, we can add optimization parameters
  if (imageUrl.includes('supabase.co/storage/v1/object/public')) {
    try {
      // Try to construct a URL object
      const url = new URL(imageUrl);

      if (!url.searchParams.has('width') && width) {
        url.searchParams.set('width', width.toString());
      }

      if (!url.searchParams.has('height') && height) {
        url.searchParams.set('height', height.toString());
      }

      if (!url.searchParams.has('quality') && quality) {
        url.searchParams.set('quality', quality.toString());
      }

      return url.toString();
    } catch (error) {
      console.error("Invalid URL in getOptimizedImageUrl:", imageUrl);
      // If URL construction fails, return the original URL
      return imageUrl;
    }
  }

  // For external URLs, return as is - optimization would require
  // a service like Cloudinary, imgix, etc.
  return imageUrl;
}

/**
 * Creates a blur hash or placeholder for an image
 * This is just a stub - in a real implementation you'd want to
 * generate actual blur hashes for images
 */
export function getImagePlaceholder(imageUrl: string | undefined): string {
  // This would typically use a library like blurhash or a service
  // to generate placeholders
  return '/images/image-loading-placeholder.jpg';
}

/**
 * Prepares an array of optimized images with various sizes
 * for responsive loading
 */
export function prepareResponsiveImages(
  imageUrl: string | undefined | null,
  sizes: number[] = [400, 800, 1200]
): { src: string; width: number }[] {
  if (!imageUrl) return [];

  return sizes.map(size => ({
    src: getOptimizedImageUrl(imageUrl, { width: size }),
    width: size
  }));
}

/**
 * Gets appropriate image size based on viewport or container width
 */
export function getImageSizeForViewport(containerWidth: number): number {
  if (containerWidth < 640) return 400; // Mobile
  if (containerWidth < 1024) return 800; // Tablet
  return 1200; // Desktop
}

/**
 * Utility to generate srcSet for responsive images
 */
export function generateSrcSet(
  imageUrl: string | undefined | null,
  sizes: number[] = [400, 800, 1200]
): string {
  if (!imageUrl) return '';

  return sizes
    .map(size =>
      `${getOptimizedImageUrl(imageUrl, { width: size })} ${size}w`
    )
    .join(', ');
}
