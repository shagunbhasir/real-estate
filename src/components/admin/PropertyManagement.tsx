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
import {
  Loader2,
  MoreHorizontal,
  Search,
  Pencil,
  Trash,
  Eye,
  ImageOff,
  Edit,
  Trash2,
} from "lucide-react";
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
// TODO: Import or implement a function to get the current admin ID from session/storage
// import { getAdminIdFromSession } from '@/path/to/authUtils';

// Property interface for admin management (should match RPC return type)
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
  const [propertyFilter, setPropertyFilter] = useState<"all" | "sale" | "rent">(
    "all"
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const propertiesPerPage = 10;
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null); // State to hold admin ID

  // Get Admin ID from localStorage, checking expiry (matching adminAuth.tsx)
  const getAdminId = () => {
    const adminDataString = localStorage.getItem("admin");
    const sessionExpiryString = localStorage.getItem("adminSessionExpiry");

    if (adminDataString && sessionExpiryString) {
      const expiryDate = new Date(sessionExpiryString);
      if (expiryDate > new Date()) {
        // Session is valid
        try {
          const adminData = JSON.parse(adminDataString);
          if (adminData && adminData.id) {
            console.log(
              "Retrieved valid admin ID from localStorage ('admin' key):",
              adminData.id
            );
            return adminData.id; // Return the ID from the parsed object
          } else {
            console.error(
              "Parsed admin data from localStorage is missing 'id'."
            );
            localStorage.removeItem("admin"); // Clear invalid data
            localStorage.removeItem("adminSessionExpiry");
            return null;
          }
        } catch (e) {
          console.error("Failed to parse admin data from localStorage:", e);
          localStorage.removeItem("admin"); // Clear corrupted data
          localStorage.removeItem("adminSessionExpiry");
          return null;
        }
      } else {
        // Session expired
        console.log("Admin session found but expired. Clearing.");
        localStorage.removeItem("admin");
        localStorage.removeItem("adminSessionExpiry");
        return null;
      }
    } else {
      // No session found
      console.log(
        "No admin session found in localStorage ('admin' or 'adminSessionExpiry' key missing)."
      );
      return null;
    }
  };

  useEffect(() => {
    const adminId = getAdminId();
    if (adminId) {
      setCurrentAdminId(adminId);
      // Fetch properties only after getting the admin ID
      fetchProperties(adminId);
    } else {
      console.error("Admin ID not found. Cannot fetch properties.");
      toast({
        title: "Authentication Error",
        description: "Admin session not found. Please log in again.",
        variant: "destructive",
      });
      setLoading(false);
      // Optionally redirect to login: navigate('/admin/login');
    }
  }, []); // Run once on mount

  // Fetch properties using the RPC function
  const fetchProperties = async (adminId: string) => {
    if (!adminId) {
      console.error("fetchProperties called without adminId");
      return;
    }
    try {
      setLoading(true);
      console.log(
        "Fetching properties via RPC: admin_get_all_properties_with_owners"
      );

      const { data, error } = await supabase.rpc(
        "admin_get_all_properties_with_owners",
        {
          p_requesting_admin_id: adminId,
        }
      );

      if (error) {
        console.error("Error fetching properties via RPC:", error);
        throw error;
      }

      if (data) {
        // Ensure verification_status is boolean, RPC should return correct types
        const processedData = data.map((p) => ({
          ...p,
          verification_status: Boolean(p.verification_status),
        }));
        console.log("Properties fetched via RPC:", processedData);
        setProperties(processedData as Property[]); // Cast might be needed if types slightly differ
      } else {
        setProperties([]); // Set to empty array if no data
      }
    } catch (error) {
      console.error("Error in fetchProperties:", error);
      toast({
        title: "Error fetching properties",
        description: "Could not load property data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  // Handle property deletion using RPC
  const handleDeleteProperty = async () => {
    if (!selectedProperty || !currentAdminId) {
      console.error("Cannot delete: Missing selected property or admin ID.");
      toast({
        title: "Error",
        description: "Cannot perform deletion.",
        variant: "destructive",
      });
      return;
    }

    console.log(
      `Attempting to delete property ID: ${selectedProperty.id} by admin ID: ${currentAdminId}`
    );

    try {
      setLoading(true); // Indicate loading state during deletion
      const { data, error } = await supabase.rpc("admin_delete_property", {
        p_requesting_admin_id: currentAdminId,
        p_property_id: selectedProperty.id,
      });

      if (error) {
        console.error("Error deleting property via RPC:", error);
        throw error; // Throw error to be caught below
      }

      // data should be true if deletion was successful (RETURN FOUND)
      if (data === true) {
        console.log(`Property ${selectedProperty.id} deleted successfully.`);
        // Refresh the properties list *after* successful deletion
        // Ensure fetchProperties uses the stored admin ID
        if (currentAdminId) {
          await fetchProperties(currentAdminId);
        } else {
          console.error("Admin ID missing, cannot refresh properties list.");
          // Handle this case appropriately, maybe show an error or reload page
        } // <-- Add missing closing brace for the inner if
        toast({
          // Move toast inside the success block
          title: "Property deleted",
          description: "The property has been successfully deleted.",
        });
      } else {
        // Handle case where deletion RPC succeeded but didn't return true (unexpected)
        console.warn(
          `Property deletion RPC for ${selectedProperty.id} returned unexpected data:`,
          data
        );
        toast({
          title: "Deletion Status Unknown",
          description: "Could not confirm deletion status.",
          variant: "default",
        });
      }
    } catch (error: any) {
      // Add type annotation for error
      console.error("Error deleting property:", error);
      toast({
        title: "Error deleting property",
        description: error.message || "Could not delete the property.",
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
      setSelectedProperty(null);
      setLoading(false); // Ensure loading state is reset
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
  const handleVerificationChange = async (
    propertyId: string,
    setToVerified: boolean
  ) => {
    let updateSucceeded = false; // Flag to track success
    try {
      // Add detailed logging before the operation
      console.log(
        `[handleVerificationChange] Attempting update for property ID: ${propertyId}`
      );
      console.log(
        `[handleVerificationChange] Target verification status: ${setToVerified} (Type: ${typeof setToVerified})`
      );

      setLoading(true); // Set loading after logging initial info
      console.log(`==== PROPERTY VERIFICATION CHANGE (RPC Call) ====`);
      console.log(`Property ID: ${propertyId}`);
      console.log(`Change to: ${setToVerified}`);

      // Call the RPC function to update verification status
      const { error: rpcError } = await supabase.rpc(
        "update_property_verification",
        {
          p_property_id: propertyId,
          p_new_status: setToVerified,
        }
      );

      // Log the result of the RPC call immediately
      console.log(
        `[handleVerificationChange] RPC call result - Error object:`,
        rpcError
      );

      if (rpcError) {
        // Log the specific RPC error with more details and throw it
        console.error(
          "Supabase RPC error (update_property_verification):",
          JSON.stringify(rpcError, null, 2) // Stringify for better logging
        );
        // Include more details in the thrown error
        throw new Error(
          `Database update via RPC failed: ${rpcError.message} (Code: ${rpcError.code}, Details: ${rpcError.details}, Hint: ${rpcError.hint})`
        );
      }

      // If we reach here, the database update was successful
      updateSucceeded = true;
      console.log(`==== VERIFICATION DB UPDATE SUCCESSFUL ====`);

      // Update local state ONLY AFTER successful DB update
      setProperties((prevProperties) =>
        prevProperties.map((property) =>
          property.id === propertyId
            ? { ...property, verification_status: setToVerified }
            : property
        )
      );

      // Show success notification ONLY AFTER successful DB update
      toast({
        title: "Status Updated",
        description: `Property verification status has been ${
          setToVerified ? "verified" : "unverified"
        }.`,
        variant: "default", // Use default (usually green) for success
      });
    } catch (error) {
      console.error("Verification Error (Catch Block):", error);
      // Show failure toast only if the DB update didn't succeed
      if (!updateSucceeded) {
        let errorMessage =
          "Failed to update verification status. Please try again.";
        // Use the specific error message from the caught error if available
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        toast({
          title: "Verification Failed",
          description: errorMessage,
          variant: "destructive", // Use destructive (usually red) for failure
        });
      }
    } finally {
      setLoading(false); // Ensure loading state is always reset
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-gray-800">
          Property Management
        </h2>

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
            onValueChange={(v) =>
              setPropertyFilter(v as "all" | "sale" | "rent")
            }
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
                            ? "default"
                            : "destructive"
                        }
                        className={
                          property.verification_status
                            ? "bg-green-600 hover:bg-green-700 flex items-center gap-1"
                            : "flex items-center gap-1"
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
                    <TableCell>{property.views_count || 0}</TableCell>
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
                            onClick={() =>
                              handleVerificationChange(property.id, true)
                            }
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
                            onClick={() =>
                              handleVerificationChange(property.id, false)
                            }
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
                            setSelectedProperty({
                              id: property.id,
                              title: property.title,
                            });
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
              Are you sure you want to delete the property "
              {selectedProperty?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProperty}
              className="bg-red-600"
            >
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
              <p className="mt-2 text-gray-500">
                No images available for this property
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyManagement;
