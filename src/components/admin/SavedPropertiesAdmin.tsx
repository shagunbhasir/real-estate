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
import { useToast } from "@/components/ui/use-toast";
import { Loader2, MoreHorizontal, Search, Trash, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

// Saved property interface
interface SavedProperty {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
  // Joined fields
  property_title?: string;
  property_type?: "sale" | "rent";
  property_price?: number;
  property_address?: string;
  user_name?: string;
  user_email?: string;
}

const SavedPropertiesAdmin = () => {
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSaved, setSelectedSaved] = useState<SavedProperty | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch saved properties with joined user and property data
  const fetchSavedProperties = async () => {
    try {
      setLoading(true);
      
      // Get all saved properties
      const { data: savedData, error: savedError } = await supabase
        .from("saved_properties")
        .select("*")
        .order("created_at", { ascending: false });

      if (savedError) throw savedError;

      if (savedData) {
        // Enrich saved properties with user and property details
        const enrichedData = await Promise.all(
          savedData.map(async (saved) => {
            // Get property details
            const { data: propertyData, error: propertyError } = await supabase
              .from("properties")
              .select("title, type, price, address")
              .eq("id", saved.property_id)
              .single();

            // Get user details
            const { data: userData, error: userError } = await supabase
              .from("users")
              .select("full_name, email")
              .eq("id", saved.user_id)
              .single();

            // Combine data
            return {
              ...saved,
              property_title: propertyData?.title || "Unknown Property",
              property_type: propertyData?.type,
              property_price: propertyData?.price,
              property_address: propertyData?.address,
              user_name: userData?.full_name || "Unknown User",
              user_email: userData?.email,
            };
          })
        );

        setSavedProperties(enrichedData);
      }
    } catch (error) {
      console.error("Error fetching saved properties:", error);
      toast({
        title: "Error fetching saved properties",
        description: "Could not load saved property data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedProperties();
  }, []);

  // Filter saved properties based on search term
  const filteredItems = savedProperties.filter(
    (saved) =>
      saved.property_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      saved.property_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      saved.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      saved.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginate saved properties
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  // Handle deletion of saved property
  const handleDeleteSaved = async () => {
    if (!selectedSaved) return;

    try {
      const { error } = await supabase
        .from("saved_properties")
        .delete()
        .eq("id", selectedSaved.id);

      if (error) throw error;

      // Update local state
      setSavedProperties(savedProperties.filter((s) => s.id !== selectedSaved.id));
      setShowDeleteDialog(false);
      setSelectedSaved(null);

      toast({
        title: "Saved property removed",
        description: "The saved property has been successfully removed.",
      });
    } catch (error) {
      console.error("Error deleting saved property:", error);
      toast({
        title: "Error removing saved property",
        description: "There was an error removing the saved property. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Navigate to view property details
  const handleViewProperty = (propertyId: string) => {
    navigate(`/property/${propertyId}`);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format price for display
  const formatPrice = (price?: number) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Saved Properties</h2>
        
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search saved properties..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2">Loading saved properties...</span>
        </div>
      ) : savedProperties.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No saved properties found in the database.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Saved By</TableHead>
                  <TableHead>Saved On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.map((saved) => (
                  <TableRow key={saved.id}>
                    <TableCell className="font-medium max-w-[250px] truncate">
                      {saved.property_title}
                    </TableCell>
                    <TableCell>
                      {saved.property_type && (
                        <Badge
                          className={
                            saved.property_type === "sale"
                              ? "bg-blue-500"
                              : "bg-green-500"
                          }
                        >
                          {saved.property_type === "sale"
                            ? "For Sale"
                            : "For Rent"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatPrice(saved.property_price)}</TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {saved.user_name}
                      {saved.user_email && (
                        <div className="text-xs text-gray-500 truncate">
                          {saved.user_email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(saved.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleViewProperty(saved.property_id)}
                            className="flex items-center"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Property
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedSaved(saved);
                              setShowDeleteDialog(true);
                            }}
                            className="text-red-600 flex items-center"
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Remove Saved
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
            <AlertDialogTitle>Remove Saved Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this saved property? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSaved}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SavedPropertiesAdmin; 