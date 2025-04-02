import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "../ui/loading-spinner";
import { MapPin, Home, Bath, ArrowLeft, Calendar, User } from "lucide-react";
import GoogleMapComponent from "../home/GoogleMap";

interface Property {
  id: string;
  title: string;
  description: string;
  address: string;
  price: number;
  type: "sale" | "rent";
  beds: number;
  baths: number;
  sqft: number;
  imageUrl: string;
  created_at: string;
  user_id: string;
  user?: {
    full_name: string;
    email: string;
  };
}

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    async function fetchProperty() {
      if (!id) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("properties")
          .select(`*, user:user_id(full_name, email)`)
          .eq("id", id)
          .single();

        if (error) throw error;
        if (!data) throw new Error("Property not found");

        setProperty(data);

        // Geocode the address to get coordinates for the map
        if (
          window.google &&
          window.google.maps &&
          window.google.maps.Geocoder
        ) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ address: data.address }, (results, status) => {
            if (status === "OK" && results && results.length > 0) {
              const location = results[0].geometry.location;
              setCoordinates({
                lat: location.lat(),
                lng: location.lng(),
              });
            }
          });
        }
      } catch (err) {
        console.error("Error fetching property:", err);
        setError("Failed to load property details");
      } finally {
        setLoading(false);
      }
    }

    fetchProperty();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="container mx-auto py-8">
        <Button onClick={() => navigate(-1)} variant="outline" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline">
            {" "}
            {error || "Property not found"}
          </span>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(property.created_at).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  return (
    <div className="container mx-auto py-8">
      <Button onClick={() => navigate(-1)} variant="outline" className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to listings
      </Button>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {/* Property Image */}
        <div className="h-96 w-full bg-gray-200 relative">
          <img
            src={
              property.imageUrl ||
              "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"
            }
            alt={property.title}
            className="w-full h-full object-cover"
          />
          <div
            className={`absolute top-4 left-4 ${property.type === "sale" ? "bg-blue-600" : "bg-green-600"} text-white px-3 py-1 rounded-md text-sm font-medium`}
          >
            {property.type === "sale" ? "For Sale" : "For Rent"}
          </div>
        </div>

        {/* Property Details */}
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {property.title}
              </h1>
              <div className="flex items-center text-gray-600 mb-4">
                <MapPin className="h-5 w-5 mr-2 text-gray-400" />
                <span>{property.address}</span>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <p
                className={`text-3xl font-bold ${property.type === "sale" ? "text-blue-600" : "text-green-600"}`}
              >
                ${property.price.toLocaleString()}
                {property.type === "rent" ? "/month" : ""}
              </p>
            </div>
          </div>

          {/* Property Features */}
          <div className="grid grid-cols-3 gap-4 border-y border-gray-200 py-6 mb-6">
            <div className="flex flex-col items-center">
              <div className="flex items-center text-gray-700 mb-1">
                <Home className="h-5 w-5 mr-2 text-gray-500" />
                <span className="text-xl font-semibold">{property.beds}</span>
              </div>
              <p className="text-gray-500 text-sm">Bedrooms</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center text-gray-700 mb-1">
                <Bath className="h-5 w-5 mr-2 text-gray-500" />
                <span className="text-xl font-semibold">{property.baths}</span>
              </div>
              <p className="text-gray-500 text-sm">Bathrooms</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center text-gray-700 mb-1">
                <span className="text-xl font-semibold">
                  {property.sqft.toLocaleString()}
                </span>
              </div>
              <p className="text-gray-500 text-sm">Square Feet</p>
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Description</h2>
            <p className="text-gray-700 whitespace-pre-line">
              {property.description || "No description provided."}
            </p>
          </div>

          {/* Map */}
          {coordinates && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Location</h2>
              <div className="h-[300px] rounded-lg overflow-hidden">
                <GoogleMapComponent
                  center={coordinates}
                  zoom={15}
                  markers={[{ id: "property", position: coordinates }]}
                  height="300px"
                />
              </div>
            </div>
          )}

          {/* Contact Information */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
            <div className="flex items-start space-x-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">
                  {property.user?.full_name || "Property Owner"}
                </p>
                <p className="text-gray-600">
                  {property.user?.email || "Contact information not available"}
                </p>
                <div className="flex items-center text-gray-500 mt-2">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span className="text-sm">Listed on {formattedDate}</span>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Contact Owner
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
