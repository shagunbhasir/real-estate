import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import useLocationSearch from "@/hooks/useLocationSearch";
import GoogleMapComponent from "./GoogleMap";
import FilterInputs from "./FilterInputs";

interface SearchFiltersProps {
  onSearch?: (filters: any) => void;
}

export default function SearchFilters({ onSearch }: SearchFiltersProps) {
  const [propertyType, setPropertyType] = useState("any");
  const [priceRange, setPriceRange] = useState("any");
  const [bedrooms, setBedrooms] = useState("any");
  const [showMap, setShowMap] = useState(false);

  // Use the location search hook
  const {
    location,
    setLocation,
    coordinates,
    zoom,
    isLoading,
    error,
    searchLocation,
  } = useLocationSearch();

  // Show map when coordinates are available
  useEffect(() => {
    if (coordinates) {
      setShowMap(true);
    }
  }, [coordinates]);

  const handleSearch = () => {
    // First search for the location to get coordinates
    searchLocation();

    // Then call the onSearch callback with all filters
    if (onSearch) {
      onSearch({
        location,
        coordinates,
        propertyType,
        priceRange,
        bedrooms,
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-4">
        <FilterInputs
          location={location}
          setLocation={setLocation}
          propertyType={propertyType}
          setPropertyType={setPropertyType}
          priceRange={priceRange}
          setPriceRange={setPriceRange}
          bedrooms={bedrooms}
          setBedrooms={setBedrooms}
          onSearch={handleSearch}
        />
      </div>

      {/* Map Section */}
      {showMap && (
        <div className="border-t border-gray-200">
          <div className="p-4 flex justify-between items-center">
            <h3 className="font-medium">Map View</h3>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setShowMap(false)}
            >
              Hide Map
            </Button>
          </div>
          <div className="h-[300px] relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md">
                  <strong className="font-bold">Error:</strong>
                  <span className="block sm:inline"> {error}</span>
                </div>
              </div>
            )}
            <GoogleMapComponent
              center={coordinates || undefined}
              zoom={zoom}
              height="300px"
              markers={
                coordinates
                  ? [
                      {
                        id: "search-location",
                        position: coordinates,
                      },
                    ]
                  : []
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
