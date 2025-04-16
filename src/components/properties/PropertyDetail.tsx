import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "../ui/loading-spinner";
import { MapPin, Home, Bath, ArrowLeft, Calendar, User, BedDouble, Ruler, Heart, Share2, Phone, Image } from "lucide-react";
import GoogleMapComponent from "../home/GoogleMap";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ImageGalleryModal from "./ImageGalleryModal";

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
  image_url: string;
  images?: string[];
  created_at: string;
  user_id: string;
  mobile_number?: string;
  verification_status?: boolean | number | string;
  views_count?: number;
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
  const [isFavorite, setIsFavorite] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [initialImageIndex, setInitialImageIndex] = useState(0);
  const [propertyImages, setPropertyImages] = useState<string[]>([]);

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

        // Debug property data
        console.log("Property data from DB:", data);
        console.log("Property images array:", data.images);
        console.log("Property main image:", data.image_url);

        // Ensure images is a proper array
        let imagesArray = [];
        if (data.images) {
          if (Array.isArray(data.images)) {
            imagesArray = data.images.filter(img => img && typeof img === 'string' && img.trim() !== '');
          } else if (typeof data.images === 'string') {
            try {
              // Try to parse if it's a JSON string
              const parsed = JSON.parse(data.images);
              if (Array.isArray(parsed)) {
                imagesArray = parsed.filter(img => img && typeof img === 'string' && img.trim() !== '');
              } else {
                imagesArray = [data.images];
              }
            } catch (e) {
              // Not JSON, treat as a single URL
              imagesArray = [data.images];
            }
          }
        }
        
        console.log("Processed images array:", imagesArray);

        // Prepare all images
        const allImages = [];
        
        // First add the main image if it exists
        if (data.image_url) {
          allImages.push(data.image_url);
        }
        
        // Then add all additional images that aren't already in the list
        imagesArray.forEach(img => {
          // Only add the image if it's valid and not a duplicate of the main image
          if (img && typeof img === 'string' && img.trim() !== '' && !allImages.includes(img)) {
            allImages.push(img);
          }
        });
        
        console.log("Combined property images:", allImages);
        console.log("Number of combined images:", allImages.length);
        
        setPropertyImages(allImages);
        
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

  const openGallery = (index: number = 0) => {
    console.log("Opening gallery with images:", propertyImages);
    console.log("Starting at index:", index);
    setInitialImageIndex(index);
    setIsGalleryOpen(true);
  };

  // Helper function to determine if a verification status is verified
  const isVerified = (status?: boolean | number | string) => {
    if (status === true || status === 'verified' || status === 1) {
      return true;
    }
    return false;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="max-w-6xl mx-auto py-6 px-4">
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
    <div className="max-w-6xl mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <Button onClick={() => navigate(-1)} variant="outline" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to listings
        </Button>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsFavorite(!isFavorite)}
            className={isFavorite ? "text-red-500" : ""}
          >
            <Heart className={`mr-2 h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
            {isFavorite ? "Saved" : "Save"}
          </Button>
          
          <Button variant="outline" size="sm">
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-8">
          {/* Property Type Badge */}
          <div className="relative">
            <div
              className={`absolute top-4 left-4 z-10 ${property.type === "sale" ? "bg-blue-600" : "bg-green-600"} text-white px-3 py-1 rounded-md text-sm font-medium`}
            >
              {property.type === "sale" ? "For Sale" : "For Rent"}
            </div>
            
            {isVerified(property.verification_status) && (
              <div
                className="absolute top-4 right-4 z-10 bg-green-600 text-white px-3 py-1 rounded-md text-sm font-medium flex items-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="h-4 w-4 mr-1"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Verified
              </div>
            )}
            
            {/* Main image */}
            {propertyImages.length > 0 ? (
              <div className="relative h-[400px] rounded-xl overflow-hidden cursor-pointer" onClick={() => openGallery(0)}>
                <img
                  src={propertyImages[0]}
                  alt={property.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error("Main image failed to load:", propertyImages[0]);
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/property-placeholder.jpg";
                  }}
                />
                {propertyImages.length > 1 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-4 right-4 bg-white bg-opacity-80 hover:bg-opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      openGallery(0);
                    }}
                  >
                    <Image className="mr-2 h-4 w-4" />
                    View all {propertyImages.length} photos
                  </Button>
                )}
              </div>
            ) : (
              <div className="h-[400px] rounded-xl bg-gray-200 flex items-center justify-center">
                <p className="text-gray-500">No images available</p>
              </div>
            )}
            
            {/* Thumbnail images */}
            {propertyImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {propertyImages.slice(0, 4).map((image, index) => (
                  <div 
                    key={index} 
                    className="aspect-square rounded-md overflow-hidden cursor-pointer"
                    onClick={() => openGallery(index)}
                  >
                    <img 
                      src={image} 
                      alt={`${property.title} - Image ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error("Thumbnail failed to load:", image);
                        const target = e.target as HTMLImageElement;
                        target.src = "/images/property-placeholder.jpg";
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold">{property.title}</h1>
              {isVerified(property.verification_status) && (
                <Badge variant="default" className="bg-green-600 ml-2">
                  Verified
                </Badge>
              )}
              {property.verification_status !== undefined && !isVerified(property.verification_status) && (
                <Badge variant="destructive" className="ml-2">
                  Not Verified
                </Badge>
              )}
            </div>
            <div className="flex items-center text-gray-600 mb-4">
              <MapPin className="h-5 w-5 mr-2 text-gray-400" />
              <span>{property.address}</span>
            </div>

            <div className="flex items-center text-2xl font-bold text-blue-600 mb-6">
              ₹{property.price.toLocaleString('en-IN')}
              {property.type === "rent" && <span className="text-sm font-normal text-gray-500 ml-1">/month</span>}
            </div>

            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center bg-blue-50 px-3 py-2 rounded-lg">
                <BedDouble className="h-5 w-5 mr-2 text-blue-600" />
                <span className="font-medium">{property.beds} Beds</span>
              </div>
              <div className="flex items-center bg-blue-50 px-3 py-2 rounded-lg">
                <Bath className="h-5 w-5 mr-2 text-blue-600" />
                <span className="font-medium">{property.baths} Baths</span>
              </div>
              <div className="flex items-center bg-blue-50 px-3 py-2 rounded-lg">
                <Ruler className="h-5 w-5 mr-2 text-blue-600" />
                <span className="font-medium">{property.sqft.toLocaleString()} sqft</span>
              </div>
            </div>
            
            <Tabs defaultValue="details">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="location">Location</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="bg-white rounded-lg p-5 shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Property Details</h2>
                <div className="space-y-4">
                  <p className="text-gray-700 whitespace-pre-line">
                    {property.description || "No description provided."}
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                    <div className="flex flex-col">
                      <span className="text-gray-500 text-sm">Property Type</span>
                      <span className="font-medium capitalize">{property.type === "sale" ? "For Sale" : "For Rent"}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-500 text-sm">Price</span>
                      <span className="font-medium">₹{property.price.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-500 text-sm">Size</span>
                      <span className="font-medium">{property.sqft.toLocaleString()} sqft</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-500 text-sm">Listed On</span>
                      <span className="font-medium">{formattedDate}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-500 text-sm">Status</span>
                      <span className="font-medium flex items-center">
                        {isVerified(property.verification_status) ? (
                          <Badge variant="default" className="bg-green-600">Verified</Badge>
                        ) : (
                          <Badge variant="destructive">Not Verified</Badge>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="features" className="bg-white rounded-lg p-5 shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Features & Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4">
                  <div className="flex items-center">
                    <BedDouble className="h-5 w-5 mr-2 text-blue-600" />
                    <span>{property.beds} Bedrooms</span>
                  </div>
                  <div className="flex items-center">
                    <Bath className="h-5 w-5 mr-2 text-blue-600" />
                    <span>{property.baths} Bathrooms</span>
                  </div>
                  <div className="flex items-center">
                    <Ruler className="h-5 w-5 mr-2 text-blue-600" />
                    <span>{property.sqft.toLocaleString()} Sq ft</span>
                  </div>
                  
                  {/* Example amenities - can be dynamic based on property data */}
                  <div className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-blue-600 mr-2"></div>
                    <span>Parking</span>
                  </div>
                  <div className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-blue-600 mr-2"></div>
                    <span>Garden</span>
                  </div>
                  <div className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-blue-600 mr-2"></div>
                    <span>Security</span>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="location" className="bg-white rounded-lg p-5 shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Location</h2>
                <div className="flex items-center text-gray-600 mb-4">
                  <MapPin className="h-5 w-5 mr-2 text-gray-400" />
                  <span>{property.address}</span>
                </div>
                
                {coordinates ? (
                  <div className="h-[300px] rounded-lg overflow-hidden">
                    <GoogleMapComponent
                      center={coordinates}
                      zoom={15}
                      markers={[
                        {
                          id: property.id,
                          position: coordinates,
                          title: property.title,
                        },
                      ]}
                      height="300px"
                    />
                  </div>
                ) : (
                  <div className="h-[300px] bg-gray-200 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Loading map...</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="lg:col-span-4">
          {/* Contact Agent Card */}
          <Card className="bg-white shadow-md mb-6">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">Contact Agent</h3>
              
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                  <User className="h-6 w-6 text-gray-500" />
                </div>
                <div>
                  <p className="font-medium">{property.user?.full_name || "Property Agent"}</p>
                  <p className="text-sm text-gray-500">{property.user?.email || "agent@example.com"}</p>
                  {property.mobile_number && (
                    <p className="text-sm text-gray-500">{property.mobile_number}</p>
                  )}
                </div>
              </div>
              
              <Button 
                className="w-full bg-green-600 hover:bg-green-700 text-white" 
                size="lg"
                onClick={() => {
                  if (property.mobile_number) {
                    window.location.href = `tel:${property.mobile_number}`;
                  }
                }}
                disabled={!property.mobile_number}
              >
                <Phone className="mr-2 h-4 w-4" /> 
                {property.mobile_number ? "Call Agent" : "No Contact Number"}
              </Button>
            </CardContent>
          </Card>
          
          {/* Additional Info Card */}
          <Card className="bg-white shadow-md">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">Property Summary</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Property ID</span>
                  <span className="font-medium">{property.id.substring(0, 8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Property Type</span>
                  <span className="font-medium capitalize">{property.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Added</span>
                  <span className="font-medium">{formattedDate}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        images={propertyImages}
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        initialImageIndex={initialImageIndex}
      />
    </div>
  );
}
