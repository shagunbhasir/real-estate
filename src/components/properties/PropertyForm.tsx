import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabase/supabase";
import { useAuth } from "../../../supabase/auth";
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

export default function PropertyForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
    image_url: "", // Changed from imageUrl to image_url to match database schema
    images: [], // Array to store multiple image URLs
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [newPropertyId, setNewPropertyId] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // State to check if current user is admin
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if the current user is an admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      // Check if admin state is in localStorage
      const adminState = localStorage.getItem('adminState');
      setIsAdmin(adminState === 'authenticated');
    };
    
    checkAdminStatus();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
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

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Convert FileList to array and process each file
      const fileArray = Array.from(files);
      fileArray.forEach(file => handleFile(file));
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
      fileArray.forEach(file => handleFile(file));
    }
  };

  // Process the file
  const handleFile = (file: File) => {
    // Check if file is an image
    if (!file.type.match("image.*")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPEG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Add to uploaded images array
    setUploadedImages(prev => [...prev, file]);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreviews(prev => [...prev, reader.result as string]);
    };
    reader.readAsDataURL(file);
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Upload multiple images to Supabase storage
  const uploadImages = async (): Promise<{ mainImageUrl: string, imageUrls: string[] }> => {
    if (uploadedImages.length === 0) {
      return {
        mainImageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
        imageUrls: []
      };
    }

    try {
      const uploadedUrls: string[] = [];
      
      // Upload each image
      for (let i = 0; i < uploadedImages.length; i++) {
        const image = uploadedImages[i];
        setUploadProgress(Math.round((i / uploadedImages.length) * 50)); // Update progress for each upload
        
        // Create a unique file name
        const fileExt = image.name.split(".").pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}_${i}.${fileExt}`;
        const filePath = `property-images/${fileName}`;

        // Upload the file with more detailed error handling
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("properties")
          .upload(filePath, image, {
            cacheControl: "3600",
            upsert: false, // Set to false to ensure unique uploads
          });

        if (uploadError) {
          console.error("Upload error details:", uploadError);
          throw uploadError;
        }

        // Get the public URL
        const { data } = supabase.storage
          .from("properties")
          .getPublicUrl(filePath);

        if (data?.publicUrl) {
          uploadedUrls.push(data.publicUrl);
        }
      }

      setUploadProgress(100); // Complete progress after all uploads
      
      console.log("All uploaded URLs:", uploadedUrls);

      // Return the first image as the main image and all images as the array
      return {
        mainImageUrl: uploadedUrls[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
        imageUrls: uploadedUrls
      };
    } catch (error) {
      console.error("Error uploading images:", error);
      // Return default image URL instead of throwing error
      return {
        mainImageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
        imageUrls: []
      };
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.price.trim()) {
      newErrors.price = "Price is required";
    } else if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      newErrors.price = "Price must be a positive number";
    }
    if (!formData.beds.trim()) {
      newErrors.beds = "Number of bedrooms is required";
    } else if (isNaN(Number(formData.beds)) || Number(formData.beds) < 0) {
      newErrors.beds = "Bedrooms must be a non-negative number";
    }
    if (!formData.baths.trim()) {
      newErrors.baths = "Number of bathrooms is required";
    } else if (isNaN(Number(formData.baths)) || Number(formData.baths) < 0) {
      newErrors.baths = "Bathrooms must be a non-negative number";
    }
    if (!formData.sqft.trim()) {
      newErrors.sqft = "Square footage is required";
    } else if (isNaN(Number(formData.sqft)) || Number(formData.sqft) <= 0) {
      newErrors.sqft = "Square footage must be a positive number";
    }
    if (!formData.mobile_number.trim()) {
      newErrors.mobile_number = "Contact number is required";
    } else if (!/^\d{10}$/.test(formData.mobile_number.replace(/[^0-9]/g, ''))) {
      newErrors.mobile_number = "Please enter a valid 10-digit phone number";
    }
    // Make image upload optional
    // if (!uploadedImage && !imagePreview) {
    //   newErrors.image = "Please upload a property image";
    // }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to list a property",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!validateForm()) return;

    setLoading(true);

    try {
      // First upload the images if available
      let mainImageUrl = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"; // Default fallback
      let imageUrls: string[] = [];

      if (uploadedImages.length > 0) {
        try {
          const uploadResult = await uploadImages();
          mainImageUrl = uploadResult.mainImageUrl;
          imageUrls = uploadResult.imageUrls;
          console.log("Images uploaded:", imageUrls.length, "images");
          console.log("Image URLs to store:", imageUrls);
        } catch (uploadError) {
          console.error(
            "Image upload failed, using default image",
            uploadError,
          );
          // Continue with default image if upload fails
        }
      }

      // Check if no images were uploaded successfully
      if (imageUrls.length === 0) {
        console.log("No images were uploaded successfully, using default");
        imageUrls = [mainImageUrl];
      }

      // Make sure imageUrls is correct array format
      const cleanImageUrls = imageUrls.filter(url => typeof url === 'string' && url.trim() !== '');
      console.log("Final clean image URLs:", cleanImageUrls);

      // Then create the property listing
      const { data, error } = await supabase
        .from("properties")
        .insert([
          {
            title: formData.title,
            description: formData.description,
            address: formData.address,
            price: Number(formData.price),
            type: formData.type,
            beds: Number(formData.beds),
            baths: Number(formData.baths),
            sqft: Number(formData.sqft),
            mobile_number: formData.mobile_number,
            image_url: mainImageUrl, // The first image as the main image
            images: cleanImageUrls, // Clean array of image URLs
            user_id: user.id,
            // Set verification_status to 1 (verified) if the user is an admin
            verification_status: isAdmin ? 1 : 0,
            // Initialize views count
            views_count: 0
          },
        ])
        .select();

      if (error) {
        console.error("Database insertion error:", error);
        throw error;
      }

      // Log the newly created property data to verify images were stored
      console.log("Property created with data:", data);
      
      if (data && data.length > 0) {
        setNewPropertyId(data[0].id);
        setShowSuccessDialog(true);
      }
    } catch (error) {
      console.error("Error creating property listing:", error);
      toast({
        title: "Error",
        description: `Failed to create property listing: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessAction = (action: "thanks" | "review") => {
    setShowSuccessDialog(false);

    if (action === "thanks") {
      // Redirect to admin panel if user is an admin, otherwise to browse properties
      if (isAdmin) {
        navigate("/admin/properties");
      } else {
        navigate("/browse-properties");
      }
    } else {
      // Navigate to the property detail page
      navigate(`/property/${newPropertyId}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6 my-8">
      <h2 className="text-2xl font-semibold mb-6">List Your Property</h2>

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
            <Label htmlFor="price">
              Price {formData.type === "rent" && "(per month)"}
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <Input
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="e.g. 250000"
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
                className={`pl-10 ${errors.mobile_number ? "border-red-500" : ""}`}
              />
            </div>
            {errors.mobile_number && (
              <p className="text-red-500 text-sm mt-1">{errors.mobile_number}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Listing Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleSelectChange("type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">For Sale</SelectItem>
                  <SelectItem value="rent">For Rent</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
            <Label>Property Images (Select Multiple)</Label>
            <div
              className={`mt-2 border-2 border-dashed rounded-lg p-6 transition-colors ${dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"} ${errors.image ? "border-red-500" : ""}`}
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
                multiple // Allow multiple file selection
                className="hidden"
                onChange={handleFileChange}
              />

              {imagePreviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center">
                  <ImageIcon className="h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Drag and drop your images here
                  </p>
                  <p className="text-xs text-gray-500">
                    or click to browse files
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Select multiple images (JPEG, PNG, or GIF up to 5MB each)
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-medium text-gray-700">
                      {uploadedImages.length} {uploadedImages.length === 1 ? "image" : "images"} selected
                    </p>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImagePreviews([]);
                        setUploadedImages([]);
                      }}
                    >
                      Clear All
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Remove this specific image
                            setImagePreviews(prev => prev.filter((_, i) => i !== index));
                            setUploadedImages(prev => prev.filter((_, i) => i !== index));
                          }}
                          className="absolute top-2 right-2 bg-gray-800 bg-opacity-70 rounded-full p-1 text-white hover:bg-opacity-100 transition-opacity z-10"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <img
                          src={preview}
                          alt={`Property preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-md"
                        />
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {uploadedImages[index]?.name} ({Math.round(uploadedImages[index]?.size / 1024)} KB)
                        </p>
                      </div>
                    ))}
                    
                    {/* Add more images button */}
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center h-24 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      <div className="flex flex-col items-center">
                        <Upload className="h-6 w-6 text-gray-400" />
                        <span className="text-xs text-gray-500 mt-1">Add More</span>
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

        <div className="pt-4">
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
            disabled={loading}
          >
            {loading ? "Submitting..." : "List Property"}
          </Button>
        </div>
      </form>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Property Listed Successfully!</DialogTitle>
            <DialogDescription>
              Your property has been successfully added to our marketplace.
              {isAdmin && (
                <span className="block mt-2 font-medium text-green-600">
                  The property has been automatically verified.
                </span>
              )}
              {!isAdmin && (
                <span className="block mt-2">
                  Our team will verify the property shortly.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <div className="bg-green-100 rounded-full p-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-center sm:space-x-2">
            <Button
              type="button"
              onClick={() => handleSuccessAction("thanks")}
              className="mb-2 sm:mb-0"
            >
              {isAdmin ? "Return to Admin Panel" : "Thanks, Go to Listings"}
            </Button>
            <Button
              type="button"
              onClick={() => handleSuccessAction("review")}
              variant="outline"
            >
              Review My Ad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
