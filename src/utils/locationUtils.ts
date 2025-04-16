/**
 * Utility functions for location handling and geocoding
 */

// Types
export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export interface PlaceSuggestion {
  description: string;
  placeId: string;
}

// Cache for geocoded locations to reduce API calls
const geocodeCache = new Map<string, LocationCoordinates>();

/**
 * Get place suggestions from Google Places API
 * Time Complexity: O(1) - API call
 * Space Complexity: O(n) where n is the number of suggestions
 */
export const getPlaceSuggestions = async (
  query: string,
  autocompleteService: google.maps.places.AutocompleteService | null,
  country: string = 'in' // Default to India
): Promise<PlaceSuggestion[]> => {
  if (!query || !autocompleteService) return [];
  
  try {
    return new Promise((resolve) => {
      autocompleteService.getPlacePredictions(
        { 
          input: query,
          componentRestrictions: { country } 
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            const suggestions = predictions.map(prediction => ({
              description: prediction.description,
              placeId: prediction.place_id
            }));
            resolve(suggestions);
          } else {
            resolve([]);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error getting place suggestions:', error);
    return [];
  }
};

/**
 * Geocode a place by placeId to get coordinates
 * Uses caching to avoid redundant API calls
 * Time Complexity: O(1) - API call with cache
 * Space Complexity: O(1)
 */
export const geocodeByPlaceId = async (
  placeId: string,
  geocoder: google.maps.Geocoder | null
): Promise<LocationCoordinates | null> => {
  if (!placeId || !geocoder) return null;
  
  // Check cache first
  if (geocodeCache.has(placeId)) {
    return geocodeCache.get(placeId)!;
  }
  
  try {
    const result = await new Promise<google.maps.GeocoderResult>((resolve, reject) => {
      geocoder.geocode({ placeId }, (results, status) => {
        if (status === "OK" && results && results.length > 0) {
          resolve(results[0]);
        } else {
          reject(new Error("Failed to geocode place"));
        }
      });
    });
    
    const location = {
      lat: result.geometry.location.lat(),
      lng: result.geometry.location.lng()
    };
    
    // Cache the result
    geocodeCache.set(placeId, location);
    
    return location;
  } catch (error) {
    console.error('Error geocoding place:', error);
    return null;
  }
};

/**
 * Geocode an address to get coordinates
 * Uses caching to avoid redundant API calls
 * Time Complexity: O(1) - API call with cache
 * Space Complexity: O(1)
 */
export const geocodeByAddress = async (
  address: string,
  geocoder: google.maps.Geocoder | null
): Promise<LocationCoordinates | null> => {
  if (!address || !geocoder) return null;
  
  // Check cache first
  if (geocodeCache.has(address)) {
    return geocodeCache.get(address)!;
  }
  
  try {
    const result = await new Promise<google.maps.GeocoderResult>((resolve, reject) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === "OK" && results && results.length > 0) {
          resolve(results[0]);
        } else {
          reject(new Error("Failed to geocode address"));
        }
      });
    });
    
    const location = {
      lat: result.geometry.location.lat(),
      lng: result.geometry.location.lng()
    };
    
    // Cache the result
    geocodeCache.set(address, location);
    
    return location;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
};

/**
 * Calculate distance between two coordinates in kilometers
 * Using Haversine formula
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */
export const calculateDistance = (
  pointA: LocationCoordinates,
  pointB: LocationCoordinates
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (pointB.lat - pointA.lat) * Math.PI / 180;
  const dLng = (pointB.lng - pointA.lng) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(pointA.lat * Math.PI / 180) * Math.cos(pointB.lat * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  
  return distance;
};

/**
 * Filter properties by distance from a location
 * Time Complexity: O(n) where n is the number of properties
 * Space Complexity: O(n)
 */
export const filterPropertiesByDistance = (
  properties: any[],
  center: LocationCoordinates,
  maxDistanceKm: number = 10
): any[] => {
  if (!center) return properties;
  
  return properties.filter(property => {
    if (!property.latitude || !property.longitude) return false;
    
    const propertyLocation = {
      lat: property.latitude,
      lng: property.longitude
    };
    
    const distance = calculateDistance(center, propertyLocation);
    return distance <= maxDistanceKm;
  });
};

/**
 * Clear geocode cache when it gets too large
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */
export const clearGeocodeCache = (): void => {
  if (geocodeCache.size > 100) {
    geocodeCache.clear();
  }
}; 