import { useState, useEffect, useCallback } from "react";

interface LocationSearchResult {
  location: string;
  coordinates: { lat: number; lng: number } | null;
  zoom: number;
  isLoading: boolean;
  error: string | null;
}

export default function useLocationSearch() {
  const [location, setLocation] = useState("");
  const [coordinates, setCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [zoom, setZoom] = useState(12);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geocodeLocation = useCallback(async (address: string) => {
    if (!address.trim()) {
      setCoordinates(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if the Google Maps Geocoding API is available
      if (window.google && window.google.maps && window.google.maps.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();

        const result = await new Promise<google.maps.GeocoderResult[]>(
          (resolve, reject) => {
            geocoder.geocode({ address }, (results, status) => {
              if (status === "OK" && results && results.length > 0) {
                resolve(results);
              } else {
                reject(new Error(`Geocoding failed: ${status}`));
              }
            });
          },
        );

        const location = result[0];
        const { lat, lng } = location.geometry.location.toJSON();

        // Set zoom based on the type of result
        let newZoom = 12; // Default city level

        // Adjust zoom based on result types
        const types = location.types;
        if (types.includes("country")) {
          newZoom = 5;
        } else if (types.includes("administrative_area_level_1")) {
          newZoom = 7;
        } else if (
          types.includes("locality") ||
          types.includes("administrative_area_level_2")
        ) {
          newZoom = 10;
        } else if (
          types.includes("neighborhood") ||
          types.includes("sublocality")
        ) {
          newZoom = 13;
        } else if (types.includes("route")) {
          newZoom = 15;
        } else if (
          types.includes("street_address") ||
          types.includes("premise")
        ) {
          newZoom = 17;
        }

        setCoordinates({ lat, lng });
        setZoom(newZoom);
      } else {
        throw new Error("Google Maps Geocoder not available");
      }
    } catch (err) {
      console.error("Geocoding error:", err);
      setError(err instanceof Error ? err.message : "Failed to find location");
      setCoordinates(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLocationChange = (newLocation: string) => {
    setLocation(newLocation);
  };

  const searchLocation = () => {
    if (location.trim()) {
      geocodeLocation(location);
    }
  };

  return {
    location,
    coordinates,
    zoom,
    isLoading,
    error,
    setLocation: handleLocationChange,
    searchLocation,
  };
}
