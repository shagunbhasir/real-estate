import { useState, useEffect } from "react";
import { supabase } from "../../../supabase/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, MoreHorizontal, Search, Pencil, Trash, Eye, ImageOff, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { normalizeImageArray } from "@/utils/imageUtils";

// Property interface for admin management
interface Property {
  id: string;
  title: string;
  description?: string;
  address?: string;
  price: number;
  type?: "sale" | "rent";
  beds?: number;
  baths?: number;
  sqft?: number;
  imageUrl?: string;
  images?: string[];
  image_url?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at?: string;
  user_id: string;
  status?: string;
  owner_name?: string;
  owner_email?: string;
  mobile_number?: string;
  verification_status: boolean;
  views_count: number;
}

const PropertyManagement = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [propertyFilter, setPropertyFilter] = useState<"all" | "sale" | "rent">("all");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<{ id: string; title: string } | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const propertiesPerPage = 10;
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch properties from database
  const fetchProperties = async () => {
    try {
      setLoading(true);
      console.log("Fetching properties from database...");
      
      // First get properties with their basic info
      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select(`
          id,
          title,
          description,
          address,
          price,
          type,
          beds,
          baths,
          sqft,
          images,
          mobile_number,
          verification_status,
          views_count,
          created_at,
          updated_at,
          user_id
        `)
        .order("created_at", { ascending: false });

      if (propertyError) {
        console.error("Error fetching properties:", propertyError);
        throw propertyError;
      }

      if (propertyData) {
        // Log a sample property to examine the verification_status data type
        if (propertyData.length > 0) {
          console.log("Sample property data:", propertyData[0]);
          console.log("Verification status type:", typeof propertyData[0].verification_status);
          console.log("Verification status value:", propertyData[0].verification_status);
        }
        
        // Now fetch user info for each property
        const propertiesWithOwners = await Promise.all(
          propertyData.map(async (property) => {
            // Ensure verification_status is stored as a boolean
            const normalizedProperty = {
              ...property,
              verification_status: Boolean(property.verification_status)
            };
            
            if (property.user_id) {
              const { data: userData, error: userError } = await supabase
                .from("users")
                .select("full_name, email")
                .eq("id", property.user_id)
                .single();

              if (!userError && userData) {
                return {
                  ...normalizedProperty,
                  owner_name: userData.full_name,
                  owner_email: userData.email,
                };
              }
            }
            return normalizedProperty;
          })
        );

        setProperties(propertiesWithOwners);
      }
    } catch (error) {
      console.error("Error fetching properties:", error);
      toast({
        title: "Error fetching properties",
        description: "Could not load property data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  // Filter properties based on search term and property type
  const filteredProperties = properties.filter((property) => {
    const matchesSearch =
      property.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.owner_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      propertyFilter === "all" || property.type === propertyFilter;

    return matchesSearch && matchesType;
  });

  // Paginate properties
  const indexOfLastProperty = currentPage * propertiesPerPage;
  const indexOfFirstProperty = indexOfLastProperty - propertiesPerPage;
  const currentProperties = filteredProperties.slice(
    indexOfFirstProperty,
    indexOfLastProperty
  );
  const totalPages = Math.ceil(filteredProperties.length / propertiesPerPage);

  // Handle property deletion
  const handleDeleteProperty = async () => {
    if (!selectedProperty) return;

    try {
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", selectedProperty.id);

      if (error) throw error;

      // Refresh the properties list
      await fetchProperties();

      toast({
        title: "Property deleted",
        description: "The property has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting property:", error);
      toast({
        title: "Error deleting property",
        description: "There was an error deleting the property. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
      setSelectedProperty(null);
    }
  };

  // Open image preview modal with all property images
  const handleViewImages = (property: Property) => {
    // Normalize image array handling both imageUrl and images array
    const images = normalizeImageArray(property.images);
    const mainImage = property.imageUrl || property.image_url;
    
    // If we have a main image not in the array, add it first
    if (mainImage && !images.includes(mainImage)) {
      setPreviewImages([mainImage, ...images]);
    } else {
      setPreviewImages(images);
    }
    
    setShowImagePreview(true);
  };

  // Format price for display
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Navigate to edit property page
  const handleEditProperty = (propertyId: string) => {
    navigate(`/property/edit/${propertyId}`);
  };

  // Navigate to view property details
  const handleViewProperty = (propertyId: string) => {
    navigate(`/property/${propertyId}`);
  };

  // Handle property verification status change
  const handleVerificationChange = async (propertyId: string, setToVerified: boolean) => {
    try {
      setLoading(true);
      
      console.log(`==== PROPERTY VERIFICATION CHANGE ====`);
      console.log(`Property ID: ${propertyId}`);
      console.log(`Change to: ${setToVerified}`);
      
      // Update the property verification status
      // Setting the value directly as a boolean since the DB column is boolean
      const { error: updateError } = await supabase
        .from("properties")
        .update({
          verification_status: setToVerified,
          updated_at: new Date().toISOString()
        })
        .eq("id", propertyId);
      
      if (updateError) {
        throw new Error(`Failed to update verification status: ${updateError.message}`);
      }
      
      // Update local state to avoid unnecessary refresh
      setProperties(prevProperties => 
        prevProperties.map(property => 
          property.id === propertyId 
            ? { ...property, verification_status: setToVerified } 
            : property
        )
      );
      
      // Show success notification
      toast({
        title: "Status Updated",
        description: `Property verification status has been ${setToVerified ? "verified" : "unverified"}.`,
        variant: "default",
      });
      
      console.log(`==== VERIFICATION SUCCESSFUL ====`);
      
    } catch (error) {
      console.error("Verification Error:", error);
      
      let errorMessage = "Failed to update verification status";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Verification Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Property Management</h2>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => navigate("/list-property")}
            className="bg-green-600 hover:bg-green-700"
          >
            List Property
          </Button>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search properties..."
              className="pl-8 min-w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Tabs
            value={propertyFilter}
            onValueChange={(v) => setPropertyFilter(v as "all" | "sale" | "rent")}
            className="w-auto"
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="sale">For Sale</TabsTrigger>
              <TabsTrigger value="rent">For Rent</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2">Loading properties...</span>
        </div>
      ) : properties.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No properties found in the database.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentProperties.map((property) => (
                  <TableRow key={property.id}>
                    <TableCell className="font-medium max-w-[250px] truncate">
                      {property.title}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          property.type === "sale"
                            ? "bg-blue-500"
                            : "bg-green-500"
                        }
                      >
                        {property.type === "sale" ? "For Sale" : "For Rent"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatPrice(property.price)}</TableCell>
                    <TableCell>{property.mobile_number || "N/A"}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          property.verification_status 
                            ? 'default' 
                            : 'destructive'
                        }
                        className={
                          property.verification_status
                            ? 'bg-green-600 hover:bg-green-700 flex items-center gap-1'
                            : 'flex items-center gap-1'
                        }
                      >
                        {property.verification_status ? (
                          <>
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              className="h-3 w-3" 
                              viewBox="0 0 20 20" 
                              fill="currentColor"
                            >
                              <path 
                                fillRule="evenodd" 
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                                clipRule="evenodd" 
                              />
                            </svg>
                            Verified
                          </>
                        ) : (
                          <>
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              className="h-3 w-3" 
                              viewBox="0 0 20 20" 
                              fill="currentColor"
                            >
                              <path 
                                fillRule="evenodd" 
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                                clipRule="evenodd" 
                              />
                            </svg>
                            Not Verified
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {property.views_count || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewProperty(property.id)}
                        >
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>
                        {!property.verification_status ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerificationChange(property.id, true)}
                            className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                            disabled={loading}
                          >
                            {loading ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Verifying...
                              </>
                            ) : (
                              <>Verify</>
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerificationChange(property.id, false)}
                            className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                            disabled={loading}
                          >
                            {loading ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              <>Refute</>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditProperty(property.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProperty({ id: property.id, title: property.title });
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4 space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="py-2 px-3 bg-white rounded-md shadow text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the property "{selectedProperty?.title}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProperty} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image preview dialog */}
      <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Property Images</DialogTitle>
            <DialogDescription>
              {previewImages.length} images available for this property
            </DialogDescription>
          </DialogHeader>

          {previewImages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {previewImages.map((image, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-0">
                    <img
                      src={image}
                      alt={`Property image ${index + 1}`}
                      className="w-full h-64 object-cover"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ImageOff className="h-12 w-12 mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500">No images available for this property</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyManagement;