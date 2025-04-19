import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../../supabase/supabase";
// Remove useAuth if not needed for standard user auth here, or keep if mixed use
// import { useAuth } from "../../../supabase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  MapPin,
  Home,
  DollarSign,
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  Phone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// TODO: Import or implement a function to get the current admin ID from session/storage
// import { getAdminIdFromSession } from '@/path/to/authUtils';

export default function PropertyFormEditor() {
  // const { user } = useAuth(); // Remove or keep based on whether non-admins can edit
  const navigate = useNavigate();
  const { propertyId } = useParams<{ propertyId: string }>(); // Add type hint
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    address: "",
    price: "",
    type: "sale",
    beds: "",
    baths: "",
    sqft: "",
    mobile_number: "",
    image_url: "",
    images: [], // Array to store multiple image URLs
  });

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null); // State for admin ID

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch admin ID and property data when component mounts
  useEffect(() => {
    // Get Admin ID first
    const adminId = getAdminId();
    if (adminId) {
      setCurrentAdminId(adminId);
    } else {
      console.error("Admin ID not found. Cannot edit property.");
      toast({
        title: "Authentication Error",
        description: "Admin session not found. Please log in again.",
        variant: "destructive",
      });
      setFetchLoading(false); // Stop loading as we can't proceed
      // Optionally redirect: navigate('/admin/login');
      return; // Stop execution if no admin ID
    }

    const fetchPropertyData = async () => {
      if (!propertyId) return;

      try {
        setFetchLoading(true);
        // Fetching initial data can still use select if RLS allows viewing,
        // or switch to an admin_get_property_by_id RPC if needed.
        // Let's assume SELECT is okay for now based on existing RLS.
        const { data, error } = await supabase
          .from("properties")
          .select("*")
          .eq("id", propertyId)
          .single();

        if (error) {
          console.error("Error fetching property data (direct select):", error);
          // If direct select fails due to RLS, you might need an admin RPC for fetching too.
          // Example: await supabase.rpc('admin_get_property_by_id', { p_requesting_admin_id: adminId, p_property_id: propertyId });
          throw error;
        }

        if (data) {
          console.log("Fetched property data:", data);
          console.log("Original images array:", data.images);

          // Ensure images is a proper array
          let imagesArray = [];
          if (data.images) {
            if (Array.isArray(data.images)) {
              imagesArray = data.images.filter(
                (img) => img && typeof img === "string" && img.trim() !== ""
              );
            } else if (typeof data.images === "string") {
              imagesArray = [data.images];
            }
          }

          console.log("Processed images array:", imagesArray);

          // Convert numeric values to strings for form inputs
          setFormData({
            title: data.title || "",
            description: data.description || "",
            address: data.address || "",
            price: data.price?.toString() || "",
            type: data.type || "sale",
            beds: data.beds?.toString() || "",
            baths: data.baths?.toString() || "",
            sqft: data.sqft?.toString() || "",
            mobile_number: data.mobile_number || "",
            image_url: data.image_url || "",
            images: imagesArray,
          });

          // Set existing images for display
          const mainImage = data.image_url || "";

          // Create a combined array of all images without duplicates
          const allImages = [
            ...new Set([mainImage, ...imagesArray].filter(Boolean)),
          ];
          console.log("Combined image array:", allImages);

          setExistingImages(allImages);
          setImagePreviews(allImages);
        }
      } catch (error) {
        console.error("Error fetching property data:", error);
        toast({
          title: "Error",
          description: "Could not load property data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setFetchLoading(false);
      }
    };

    fetchPropertyData();
  }, [propertyId, toast]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  // Handle drag events for the drop area
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Process a single file upload
  const handleFile = (file: File) => {
    // Basic validation
    if (!file.type.match("image.*")) {
      toast({
        title: "Invalid file type",
        description: "Please upload image files only (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      toast({
        title: "File too large",
        description: "Image files must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Add file to uploaded images array
    setUploadedImages((prev) => [...prev, file]);

    // Create preview URL
    const fileUrl = URL.createObjectURL(file);
    setImagePreviews((prev) => [...prev, fileUrl]);
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Convert FileList to array and process each file
      const fileArray = Array.from(files);
      fileArray.forEach((file) => handleFile(file));
    }
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Convert FileList to array and process each file
      const fileArray = Array.from(e.dataTransfer.files);
      fileArray.forEach((file) => handleFile(file));
    }
  };

  // Remove image from preview and uploaded files
  const handleRemoveImage = (index: number) => {
    // Check if it's an existing image or a new upload
    if (index < existingImages.length) {
      // It's an existing image
      const updatedExisting = [...existingImages];
      updatedExisting.splice(index, 1);
      setExistingImages(updatedExisting);

      // Also update previews
      const updatedPreviews = [...imagePreviews];
      updatedPreviews.splice(index, 1);
      setImagePreviews(updatedPreviews);
    } else {
      // It's a new upload
      const adjustedIndex = index - existingImages.length;

      // Remove from uploaded images
      const updatedUploads = [...uploadedImages];
      updatedUploads.splice(adjustedIndex, 1);
      setUploadedImages(updatedUploads);

      // Remove from previews
      const updatedPreviews = [...imagePreviews];
      updatedPreviews.splice(index, 1);
      setImagePreviews(updatedPreviews);
    }
  };

  // Upload all images to Supabase storage
  const uploadImages = async () => {
    if (uploadedImages.length === 0 && existingImages.length === 0) {
      return {
        mainImageUrl:
          "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
        imageUrls: [],
      };
    }

    let progress = 0;
    const increment = 100 / (uploadedImages.length || 1);
    const imageUrls: string[] = [...existingImages]; // Start with existing images

    try {
      // Only upload new images
      for (let i = 0; i < uploadedImages.length; i++) {
        const file = uploadedImages[i];
        // Create a unique file path - use adminId or a generic path if user is null
        const fileExt = file.name.split(".").pop();
        const userIdForPath = currentAdminId || "admin-uploads"; // Use admin ID or fallback
        const filePath = `${userIdForPath}/${Date.now()}-${Math.random()
          .toString(36)
          .substring(2)}-${i}.${fileExt}`;

        // Upload the file
        const { error: uploadError } = await supabase.storage
          .from("properties")
          .upload(filePath, file, {
            upsert: false, // Ensure we don't overwrite existing files
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw uploadError;
        }

        // Get the public URL
        const { data } = supabase.storage
          .from("properties")
          .getPublicUrl(filePath);

        if (data?.publicUrl) {
          imageUrls.push(data.publicUrl);
        }

        // Update progress
        progress += increment;
        setUploadProgress(Math.min(Math.round(progress), 100));
      }

      console.log("Final image URLs to store:", imageUrls);

      // Set the main image (first one) and return all URLs
      const mainImageUrl =
        imageUrls.length > 0
          ? imageUrls[0]
          : "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80";

      return { mainImageUrl, imageUrls };
    } catch (error) {
      console.error("Error uploading images:", error);
      throw error;
    }
  };

  // Validate form data
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = "Title is required";
    }

    if (!formData.description.trim()) {
      errors.description = "Description is required";
    }

    if (!formData.address.trim()) {
      errors.address = "Address is required";
    }

    // Handle numeric fields properly
    const price = Number(formData.price);
    if (isNaN(price) || price <= 0) {
      errors.price = "Price must be greater than 0";
    }

    if (!formData.type) {
      errors.type = "Property type is required";
    }

    const beds = Number(formData.beds);
    if (isNaN(beds) || beds <= 0) {
      errors.beds = "Number of beds is required";
    }

    const baths = Number(formData.baths);
    if (isNaN(baths) || baths <= 0) {
      errors.baths = "Number of baths is required";
    }

    const sqft = Number(formData.sqft);
    if (isNaN(sqft) || sqft <= 0) {
      errors.sqft = "Square footage is required";
    }

    // Handle mobile_number validation - only validate if it's provided and is a string
    if (formData.mobile_number && typeof formData.mobile_number === "string") {
      const trimmedMobile = formData.mobile_number.trim();
      if (trimmedMobile !== "" && !/^\d{10}$/.test(trimmedMobile)) {
        errors.mobile_number = "Mobile number must be 10 digits";
      }
    }

    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission using RPC
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentAdminId) {
      toast({
        title: "Error",
        description: "Admin session not found. Cannot update.",
        variant: "destructive",
      });
      return;
    }
    if (!propertyId) {
      toast({
        title: "Error",
        description: "Property ID is missing.",
        variant: "destructive",
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // --- Image Upload Logic (mostly unchanged) ---
      let finalImageUrls: string[] = [...existingImages]; // Start with existing images that weren't removed
      if (uploadedImages.length > 0) {
        console.log("Uploading new images...");
        setUploadProgress(1); // Indicate start of upload
        const uploadedResult = await uploadImages(); // This now uses adminId for path
        // Combine existing (filtered) and newly uploaded URLs, ensuring no duplicates
        finalImageUrls = [
          ...new Set([...existingImages, ...uploadedResult.imageUrls]),
        ];
        setUploadProgress(100); // Mark as complete
        console.log("Image upload complete. Final URLs:", finalImageUrls);
      } else {
        console.log("No new images to upload. Using existing:", existingImages);
        finalImageUrls = [...existingImages]; // Use only the remaining existing images
      }

      // Clean the final imageUrls array
      const cleanedImageUrls = finalImageUrls.filter(
        (url) => url && typeof url === "string" && url.trim() !== ""
      );
      console.log("Cleaned final image URLs:", cleanedImageUrls);

      // --- Prepare Data for RPC ---
      const propertyDataForUpdate = {
        title: formData.title,
        description: formData.description,
        address: formData.address,
        price: Number(formData.price),
        type: formData.type,
        beds: Number(formData.beds),
        baths: Number(formData.baths),
        sqft: Number(formData.sqft),
        images: cleanedImageUrls, // Use the final cleaned array
        // Set the main imageUrl based on the first image in the final array
        imageUrl: cleanedImageUrls.length > 0 ? cleanedImageUrls[0] : null,
        // Include mobile_number if valid
        ...(formData.mobile_number &&
        typeof formData.mobile_number === "string" &&
        /^\d{10}$/.test(formData.mobile_number.trim())
          ? { mobile_number: formData.mobile_number.trim() }
          : { mobile_number: null }), // Set to null if invalid or empty
        // updated_at is handled by the RPC function
      };

      console.log(
        "Calling RPC admin_update_property with data:",
        propertyDataForUpdate
      );
      console.log("Admin ID:", currentAdminId);
      console.log("Property ID:", propertyId);

      // --- Call RPC Function ---
      const { data: updateResult, error: rpcError } = await supabase.rpc(
        "admin_update_property",
        {
          p_requesting_admin_id: currentAdminId,
          p_property_id: propertyId,
          p_property_data: propertyDataForUpdate, // Pass the data as JSONB
        }
      );

      if (rpcError) {
        console.error("RPC Error updating property:", rpcError);
        throw rpcError; // Throw to be caught below
      }

      // Check the result from the RPC function (should return true on success)
      if (updateResult !== true) {
        console.warn(
          "Admin update RPC returned unexpected result:",
          updateResult
        );
        // Throw an error or handle as appropriate if update didn't succeed on DB side
        throw new Error("Database update did not confirm success.");
      }

      console.log("Property update successful via RPC.");

      // --- Success Handling (unchanged) ---
      toast({
        title: "Success",
        description: "Property has been updated successfully!",
        variant: "default",
      });

      // Show success dialog
      setShowSuccessDialog(true);

      // Reset form after successful submission
      setTimeout(() => {
        navigate("/admin/properties");
      }, 2000);
    } catch (error) {
      console.error("Error updating property:", error);
      toast({
        title: "Error",
        description: "Failed to update property. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessAction = (action: "admin" | "view") => {
    setShowSuccessDialog(false);

    if (action === "admin") {
      navigate("/admin"); // Return to admin dashboard
    } else {
      // Navigate to the property detail page
      navigate(`/property/${propertyId}`);
    }
  };

  if (fetchLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2">Loading property data...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6 my-8">
      <h2 className="text-2xl font-semibold mb-6">Edit Property</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Property Title</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Modern Family Home with Garden"
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your property..."
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Full property address"
                className={`pl-10 ${errors.address ? "border-red-500" : ""}`}
              />
            </div>
            {errors.address && (
              <p className="text-red-500 text-sm mt-1">{errors.address}</p>
            )}
          </div>

          <div>
            <Label htmlFor="price">Price</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <Input
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="Property price"
                className={`pl-10 ${errors.price ? "border-red-500" : ""}`}
              />
            </div>
            {errors.price && (
              <p className="text-red-500 text-sm mt-1">{errors.price}</p>
            )}
          </div>

          <div>
            <Label htmlFor="mobile_number">Contact Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <Input
                id="mobile_number"
                name="mobile_number"
                value={formData.mobile_number}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                className={`pl-10 ${
                  errors.mobile_number ? "border-red-500" : ""
                }`}
              />
            </div>
            {errors.mobile_number && (
              <p className="text-red-500 text-sm mt-1">
                {errors.mobile_number}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="type">Property Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleSelectChange("type", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select property type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sale">For Sale</SelectItem>
                <SelectItem value="rent">For Rent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="beds">Bedrooms</Label>
              <div className="relative">
                <Home className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <Input
                  id="beds"
                  name="beds"
                  value={formData.beds}
                  onChange={handleChange}
                  placeholder="e.g. 3"
                  className={`pl-10 ${errors.beds ? "border-red-500" : ""}`}
                />
              </div>
              {errors.beds && (
                <p className="text-red-500 text-sm mt-1">{errors.beds}</p>
              )}
            </div>

            <div>
              <Label htmlFor="baths">Bathrooms</Label>
              <Input
                id="baths"
                name="baths"
                value={formData.baths}
                onChange={handleChange}
                placeholder="e.g. 2"
                className={errors.baths ? "border-red-500" : ""}
              />
              {errors.baths && (
                <p className="text-red-500 text-sm mt-1">{errors.baths}</p>
              )}
            </div>

            <div>
              <Label htmlFor="sqft">Square Footage</Label>
              <Input
                id="sqft"
                name="sqft"
                value={formData.sqft}
                onChange={handleChange}
                placeholder="e.g. 1500"
                className={errors.sqft ? "border-red-500" : ""}
              />
              {errors.sqft && (
                <p className="text-red-500 text-sm mt-1">{errors.sqft}</p>
              )}
            </div>
          </div>

          <div>
            <Label>Property Images</Label>
            <div
              className={`mt-2 border-2 border-dashed rounded-lg p-6 transition-colors ${
                dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
              } ${errors.image ? "border-red-500" : ""}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />

              {imagePreviews.length === 0 ? (
                <div className="text-center">
                  <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 mb-2">
                    Drag & drop images here or click to browse
                  </p>
                  <p className="text-gray-400 text-sm">
                    JPG, PNG or GIF, up to 5MB each
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-500 text-sm mb-2">
                    {imagePreviews.length} image
                    {imagePreviews.length !== 1 ? "s" : ""} selected
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {imagePreviews.map((src, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={src}
                          alt={`Property ${index + 1}`}
                          className="h-24 w-full object-cover rounded-md"
                        />
                        <button
                          type="button"
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(index);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    <div
                      className="border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center h-24 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      <div className="flex flex-col items-center">
                        <Upload className="h-6 w-6 text-gray-400" />
                        <span className="text-xs text-gray-500 mt-1">
                          Add More
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {errors.image && (
              <p className="text-red-500 text-sm mt-1">{errors.image}</p>
            )}
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin")}
            className="w-full"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Property"
            )}
          </Button>
        </div>
      </form>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Property Updated Successfully!</DialogTitle>
            <DialogDescription>
              Your property listing has been updated.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 flex justify-center">
            <ImageIcon className="h-16 w-16 text-green-500" />
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => handleSuccessAction("admin")}
              className="w-full"
              variant="outline"
            >
              Return to Admin
            </Button>
            <Button
              onClick={() => handleSuccessAction("view")}
              className="w-full"
            >
              View Property
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
