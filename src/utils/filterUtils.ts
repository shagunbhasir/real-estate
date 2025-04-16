import { supabase } from "../../supabase/supabase";

export interface Property {
  id: string;
  title: string;
  address?: string;
  price: number;
  type?: "sale" | "rent";
  beds?: number;
  baths?: number;
  sqft?: number;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  images?: string[];
  image_url?: string; // For backward compatibility with database
  created_at?: string;
}

export interface RawProperty {
  id: string;
  title: string;
  address?: string;
  price: number;
  type?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  image_url?: string;
  latitude?: number;
  longitude?: number;
  images?: string[];
  created_at?: string;
  [key: string]: any; // Allow for additional properties
}

export interface FilterOptions {
  propertyType?: "all" | "sale" | "rent";
  priceRange?: [number, number];
  location?: {
    placeId: string;
    description: string;
  } | null;
}

// Memoization cache for formatProperty function
const propertyCache = new Map<string, Property>();

/**
 * Format a raw property object from the database
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */
export const formatProperty = (property: RawProperty): Property => {
  // Check cache first
  const cacheKey = `${property.id}-${property.updated_at || property.created_at}`;
  if (propertyCache.has(cacheKey)) {
    return propertyCache.get(cacheKey)!;
  }
  
  // Use normalizeProperty to handle imageUrl and image_url
  const normalizedProperty = normalizeProperty(property);
  
  const formattedProperty: Property = {
    ...normalizedProperty,
    type: (property.type === "sale" || property.type === "rent") 
      ? property.type 
      : "sale" as const,
  };

  // Store in cache
  propertyCache.set(cacheKey, formattedProperty);
  
  return formattedProperty;
};

/**
 * Clear the property format cache when it gets too large
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */
export const clearPropertyCache = () => {
  if (propertyCache.size > 1000) {
    propertyCache.clear();
  }
};

/**
 * Fetch all properties from the database with optional filters
 * Time Complexity: O(n) where n is the number of properties
 * Space Complexity: O(n)
 */
export const fetchProperties = async (filters?: FilterOptions): Promise<Property[]> => {
  try {
    // Start with base query
    let query = supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Add type filter if specified
    if (filters?.propertyType && filters.propertyType !== "all") {
      query = query.eq('type', filters.propertyType);
    }
    
    // Add price range filter if specified
    if (filters?.priceRange) {
      const [minPrice, maxPrice] = filters.priceRange;
      query = query
        .gte('price', minPrice)
        .lte('price', maxPrice);
    }
    
    // Execute query
    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Format properties using normalizeProperty first
    return data ? data.map((property) => formatProperty(property)) : [];
    
  } catch (error) {
    console.error('Error fetching properties:', error);
    return [];
  }
};

/**
 * Filter an array of properties by type and price range
 * Time Complexity: O(n) where n is the number of properties
 * Space Complexity: O(n)
 */
export const filterProperties = (
  properties: Property[], 
  filters: FilterOptions
): Property[] => {
  // Use Map to create a lookup for efficient filtering
  const filteredProperties = properties.filter(property => {
    // Type filter
    if (filters.propertyType && filters.propertyType !== "all") {
      if (property.type !== filters.propertyType) return false;
    }
    
    // Price filter
    if (filters.priceRange) {
      const [minPrice, maxPrice] = filters.priceRange;
      if (property.price < minPrice || property.price > maxPrice) return false;
    }
    
    return true;
  });
  
  return filteredProperties;
};

/**
 * Format price for display in rupees
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */
export const formatPriceDisplay = (value: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Get price range values from string identifier
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */
export const getPriceRangeFromString = (value: string): [number, number] => {
  switch(value) {
    case "any":
      return [0, 100000000];
    case "0-500000":
      return [0, 500000];
    case "500000-2000000":
      return [500000, 2000000];
    case "2000000-5000000":
      return [2000000, 5000000];
    case "5000000-10000000":
      return [5000000, 10000000];
    case "10000000-20000000":
      return [10000000, 20000000];
    case "20000000+":
      return [20000000, 100000000];
    default:
      return [0, 100000000];
  }
};

// Helper function to normalize property data coming from different sources
export function normalizeProperty(property: any): Property {
  return {
    ...property,
    // Ensure imageUrl is set (prefer imageUrl, fallback to image_url)
    imageUrl: property.imageUrl || property.image_url || "",
    // Convert string prices to numbers if needed
    price: typeof property.price === 'string' ? parseFloat(property.price) : property.price,
  };
} 