import { useState, useEffect } from "react";
import { supabase } from "../../../supabase/supabase";
import PropertyCard from "../home/PropertyCard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "../ui/loading-spinner";

interface Property {
  id: string;
  title: string;
  address: string;
  price: number;
  type: "sale" | "rent";
  beds: number;
  baths: number;
  sqft: number;
  image_url: string; // Changed from imageUrl to image_url to match database schema
  images?: string[]; // Array of additional images
  created_at: string;
  user_id: string;
}

export default function PropertyListing() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchProperties() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("properties")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProperties(data || []);
      } catch (err) {
        console.error("Error fetching properties:", err);
        setError("Failed to load properties");
      } finally {
        setLoading(false);
      }
    }

    fetchProperties();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-semibold">Browse Properties</h2>
        <Button
          onClick={() => navigate("/list-property")}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          List Your Property
        </Button>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h3 className="text-xl font-medium text-gray-600 mb-4">
            No properties found
          </h3>
          <p className="text-gray-500 mb-6">
            Be the first to list a property on our platform!
          </p>
          <Button
            onClick={() => navigate("/list-property")}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            List Your Property
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {properties.map((property) => (
            <div
              key={property.id}
              onClick={() => navigate(`/property/${property.id}`)}
              className="cursor-pointer"
            >
              <PropertyCard
                type={property.type}
                title={property.title}
                address={property.address}
                price={
                  property.type === "sale"
                    ? `₹${property.price.toLocaleString()}`
                    : `₹${property.price.toLocaleString()}/mo`
                }
                beds={property.beds}
                baths={property.baths}
                sqft={property.sqft}
                imageUrl={
                  property.image_url ||
                  (property.images && property.images.length > 0 ? property.images[0] : 
                  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80")
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
