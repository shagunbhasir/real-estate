import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function MapSearch() {
  // This is a placeholder for a real map integration
  // In a real implementation, you would use a library like Google Maps, Mapbox, or Leaflet

  const [activeMarker, setActiveMarker] = useState<number | null>(null);

  // Sample property data
  const properties = [
    { id: 1, lat: 40.7128, lng: -74.006, price: "$850,000", type: "sale" },
    { id: 2, lat: 40.7328, lng: -73.986, price: "$3,500/mo", type: "rent" },
    { id: 3, lat: 40.7228, lng: -74.026, price: "$1,250,000", type: "sale" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="font-medium">Map View</h3>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" className="text-xs">
              For Sale
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              For Rent
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              Draw
            </Button>
          </div>
        </div>
      </div>

      {/* Placeholder for the actual map */}
      <div className="relative h-[400px] bg-gray-100 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="mb-2">Interactive Map Would Appear Here</p>
          <p className="text-sm">
            Integrated with Google Maps, Mapbox, or Leaflet
          </p>

          {/* Sample markers */}
          <div className="mt-4 flex justify-center space-x-4">
            {properties.map((property) => (
              <div
                key={property.id}
                className={`
                  p-2 rounded-full cursor-pointer transition-all
                  ${activeMarker === property.id ? "bg-blue-100" : "bg-white"}
                  ${property.type === "sale" ? "text-blue-600" : "text-green-600"}
                  border border-current
                `}
                onClick={() => setActiveMarker(property.id)}
              >
                {property.price}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-sm text-gray-500">3 properties found</span>
          </div>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            View List
          </Button>
        </div>
      </div>
    </div>
  );
}
