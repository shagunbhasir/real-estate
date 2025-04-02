import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilterInputsProps {
  location: string;
  setLocation: (location: string) => void;
  propertyType: string;
  setPropertyType: (propertyType: string) => void;
  priceRange: string;
  setPriceRange: (priceRange: string) => void;
  bedrooms: string;
  setBedrooms: (bedrooms: string) => void;
  onSearch: () => void;
}

export default function FilterInputs({
  location,
  setLocation,
  propertyType,
  setPropertyType,
  priceRange,
  setPriceRange,
  bedrooms,
  setBedrooms,
  onSearch,
}: FilterInputsProps) {
  return (
    <div className="flex flex-col space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Location Search */}
        <div className="col-span-1 md:col-span-2">
          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Enter location, neighborhood, or address"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>

        {/* Property Type */}
        <div>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
          >
            <option value="any">Any Property</option>
            <option value="house">House</option>
            <option value="apartment">Apartment</option>
            <option value="condo">Condo</option>
            <option value="townhouse">Townhouse</option>
            <option value="land">Land</option>
          </select>
        </div>

        {/* Price Range */}
        <div>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
          >
            <option value="any">Any Price</option>
            <option value="0-100000">Under $100k</option>
            <option value="100000-300000">$100k - $300k</option>
            <option value="300000-500000">$300k - $500k</option>
            <option value="500000-750000">$500k - $750k</option>
            <option value="750000-1000000">$750k - $1M</option>
            <option value="1000000+">$1M+</option>
          </select>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex space-x-4">
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
          >
            <option value="any">Any Beds</option>
            <option value="1">1+ Beds</option>
            <option value="2">2+ Beds</option>
            <option value="3">3+ Beds</option>
            <option value="4">4+ Beds</option>
            <option value="5">5+ Beds</option>
          </select>

          <button className="text-blue-600 hover:text-blue-800 font-medium">
            More Filters
          </button>
        </div>

        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          onClick={onSearch}
        >
          Search
        </Button>
      </div>
    </div>
  );
}
