import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Search, X, Grid, SlidersHorizontal } from "lucide-react";
import { supabase } from "../../../supabase/supabase";
import PropertyCard from "./PropertyCard";
import { useJsApiLoader } from "@react-google-maps/api";
import { Slider } from "@/components/ui/slider";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Import utility functions
import { 
  fetchProperties, 
  filterProperties, 
  formatPriceDisplay, 
  getPriceRangeFromString,
  FilterOptions,
  Property as FilterProperty,
} from "@/utils/filterUtils";
import { 
  getPlaceSuggestions, 
  geocodeByPlaceId, 
  filterPropertiesByDistance,
  PlaceSuggestion,
  LocationCoordinates
} from "@/utils/locationUtils";
import { debounce } from "@/utils/debounceUtils";

// Define libraries for Google Maps
type Libraries = ("places" | "drawing" | "geometry" | "visualization")[];
const libraries: Libraries = ["places"];

// ₹ symbol for rupees
const RUPEE_SYMBOL = "₹";

// Conversion rate (for example purposes - in a real app you'd use a proper currency conversion API)
const USD_TO_INR = 83; // 1 USD = 83 INR (approximate)

export default function LocationSearchWithProperties() {
  // State for search and filter functionality
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{ placeId: string; description: string } | null>(null);
  const [coordinates, setCoordinates] = useState<LocationCoordinates | null>(null);
  
  // State for properties
  const [properties, setProperties] = useState<FilterProperty[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<FilterProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Filter states
  const [propertyType, setPropertyType] = useState<"all" | "sale" | "rent">("all");
  const [budget, setBudget] = useState<[number, number]>([0, 100000000]); // Higher values for rupees
  const [priceRange, setPriceRange] = useState<string>("any");
  
  // Mobile sidebar state
  const [showSidebar, setShowSidebar] = useState(false);
  
  // Refs for services and DOM elements
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoderService = useRef<google.maps.Geocoder | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const dummyElement = useRef<HTMLDivElement>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // Initialize Google services when API is loaded
  useEffect(() => {
    if (isLoaded) {
      autocompleteService.current = new google.maps.places.AutocompleteService();
      geocoderService.current = new google.maps.Geocoder();
      
      // Create a dummy element for PlacesService
      if (dummyElement.current) {
        placesService.current = new google.maps.places.PlacesService(dummyElement.current);
      }
    }
  }, [isLoaded]);

  // Fetch all properties on component mount
  useEffect(() => {
    const initialFetch = async () => {
      setInitialLoading(true);
      const allProperties = await fetchProperties();
      setProperties(allProperties);
      setFilteredProperties(allProperties);
      setInitialLoading(false);
    };
    
    initialFetch();
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Memoized search handler with debounce
  const debouncedSearchHandler = useMemo(() => 
    debounce(async (query: string) => {
      if (!query || query.length < 3 || !autocompleteService.current) return;
      
      const results = await getPlaceSuggestions(
        query, 
        autocompleteService.current
      );
      
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 300), 
    []
  );

  // Handle search input changes 
  const handleSearchInputChange = useCallback((value: string) => {
    setSearchInput(value);
    debouncedSearchHandler(value);
  }, [debouncedSearchHandler]);

  // Handle selecting a place from suggestions
  const handleSelectPlace = useCallback(async (suggestion: PlaceSuggestion) => {
    setSearchInput(suggestion.description);
    setSelectedPlace({
      placeId: suggestion.placeId,
      description: suggestion.description
    });
    setShowSuggestions(false);
    
    // Get coordinates for the selected place
    if (geocoderService.current) {
      const location = await geocodeByPlaceId(
        suggestion.placeId, 
        geocoderService.current
      );
      
      if (location) {
        setCoordinates(location);
      }
    }
  }, []);

  // Handle price range selection
  const handlePriceRangeChange = useCallback((value: string) => {
    setPriceRange(value);
    setBudget(getPriceRangeFromString(value));
  }, []);

  // Apply all filters when any filter changes
  useEffect(() => {
    if (!initialLoading) {
      applyAllFilters();
    }
  }, [propertyType, budget, selectedPlace, coordinates, initialLoading]);

  // Apply all filters at once
  const applyAllFilters = useCallback(async () => {
    try {
      setLoading(true);
      
      // Create filter options object
      const filterOptions: FilterOptions = {
        propertyType,
        priceRange: budget,
        location: selectedPlace
      };
      
      // Filter properties in memory
      let results = filterProperties(properties, filterOptions);
      
      // Apply location filter if coordinates are available
      if (coordinates) {
        results = filterPropertiesByDistance(results, coordinates);
      }
      
      setFilteredProperties(results);
    } catch (error) {
      console.error('Error filtering properties:', error);
    } finally {
      setLoading(false);
    }
  }, [properties, propertyType, budget, selectedPlace, coordinates]);

  // Clear the search
  const clearSearch = useCallback(() => {
    setSearchInput("");
    setSelectedPlace(null);
    setCoordinates(null);
    setShowSuggestions(false);
    
    // Reset to show all properties matching other filters
    applyAllFilters();
  }, [applyAllFilters]);

  // Memoize property count text for performance
  const propertyCountText = useMemo(() => {
    if (loading || initialLoading) {
      return "Loading properties...";
    }
    
    if (filteredProperties.length > 0) {
      return `${filteredProperties.length} Properties Available`;
    }
    
    return "No properties available";
  }, [loading, initialLoading, filteredProperties.length]);

  // Handle errors with Google Maps API
  if (loadError) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p>Error loading Google Maps API: {loadError.message}</p>
      </div>
    );
  }

  // Show loading state while API is being loaded
  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2">Loading location services...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Hidden div for PlacesService initialization */}
      <div ref={dummyElement} style={{ display: 'none' }}></div>
      
      {/* Mobile filter toggle */}
      <div className="md:hidden mb-4">
        <Button 
          onClick={() => setShowSidebar(!showSidebar)}
          variant="outline" 
          className="w-full flex items-center justify-center"
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filters {showSidebar ? 'Hide' : 'Show'}
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar filters - hidden on mobile unless toggled */}
        <div className={`md:w-1/4 ${showSidebar ? 'block' : 'hidden md:block'}`}>
          <Card className="bg-white shadow-md mb-6 sticky top-4">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Filters</h2>
              
              {/* Property Type Filter (Buy/Rent) */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-700 mb-2">Property Type</h3>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant={propertyType === "all" ? "default" : "outline"}
                    className={propertyType === "all" ? "bg-blue-600" : ""}
                    onClick={() => setPropertyType("all")}
                  >
                    All
                  </Button>
                  <Button 
                    variant={propertyType === "sale" ? "default" : "outline"}
                    className={propertyType === "sale" ? "bg-blue-600" : ""}
                    onClick={() => setPropertyType("sale")}
                  >
                    Buy
                  </Button>
                  <Button 
                    variant={propertyType === "rent" ? "default" : "outline"}
                    className={propertyType === "rent" ? "bg-blue-600" : ""}
                    onClick={() => setPropertyType("rent")}
                  >
                    Rent
                  </Button>
                </div>
              </div>
              
              {/* Budget Range Selector */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-700 mb-2">Budget</h3>
                <div className="space-y-4">
                  <Select 
                    value={priceRange} 
                    onValueChange={handlePriceRangeChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select price range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Price</SelectItem>
                      <SelectItem value="0-500000">Under {RUPEE_SYMBOL}5 Lakh</SelectItem>
                      <SelectItem value="500000-2000000">{RUPEE_SYMBOL}5 Lakh - {RUPEE_SYMBOL}20 Lakh</SelectItem>
                      <SelectItem value="2000000-5000000">{RUPEE_SYMBOL}20 Lakh - {RUPEE_SYMBOL}50 Lakh</SelectItem>
                      <SelectItem value="5000000-10000000">{RUPEE_SYMBOL}50 Lakh - {RUPEE_SYMBOL}1 Cr</SelectItem>
                      <SelectItem value="10000000-20000000">{RUPEE_SYMBOL}1 Cr - {RUPEE_SYMBOL}2 Cr</SelectItem>
                      <SelectItem value="20000000+">Above {RUPEE_SYMBOL}2 Cr</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="px-1">
                    <div className="flex justify-between text-sm text-gray-500 mb-2">
                      <span>{formatPriceDisplay(budget[0])}</span>
                      <span>{formatPriceDisplay(budget[1])}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Location Search with Dropdown */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-700 mb-2">Location</h3>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <Input
                    className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter location, city, or address"
                    value={searchInput}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    onClick={() => searchInput.length > 2 && setShowSuggestions(true)}
                  />
                  {searchInput && (
                    <button 
                      className="absolute right-3 top-2.5"
                      onClick={clearSearch}
                      aria-label="Clear search"
                    >
                      <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
                
                {/* Place Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div 
                    ref={suggestionsRef}
                    className="absolute z-10 mt-1 w-full max-w-[90%] md:max-w-[23%] bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
                  >
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-start"
                        onClick={() => handleSelectPlace(suggestion)}
                      >
                        <MapPin className="h-5 w-5 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                        <span className="text-sm">{suggestion.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Apply Filters Button */}
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => applyAllFilters()}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Filtering...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Apply Filters
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
          
          {/* Browse All Properties Card */}
          <Card className="bg-white shadow-md mb-6">
            <CardContent className="p-6">
              <Button 
                asChild
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Link to="/browse-properties" className="flex items-center justify-center gap-2">
                  <Grid size={18} />
                  Browse All Properties
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Property Results */}
        <div className="md:w-3/4">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold">
              {propertyCountText}
            </h2>
            {selectedPlace && (
              <p className="text-gray-500">{selectedPlace.description}</p>
            )}
          </div>

          {(loading || initialLoading) ? (
            <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow-md">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <span className="ml-3 text-lg text-gray-600">Loading properties...</span>
            </div>
          ) : filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  id={property.id}
                  type={property.type || "sale"}
                  title={property.title}
                  address={property.address || ""}
                  price={property.price}
                  beds={property.beds || 0}
                  baths={property.baths || 0}
                  sqft={property.sqft || 0}
                  imageUrl={property.imageUrl || ""}
                  allImages={property.images || []}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500">No properties found matching your criteria. Try different filters or another location.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 