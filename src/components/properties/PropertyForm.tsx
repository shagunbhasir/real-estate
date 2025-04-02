import { useState, useRef } from "react";
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
    imageUrl: "", // Will be set by upload
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [newPropertyId, setNewPropertyId] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      handleFile(files[0]);
    }
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
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

    setUploadedImage(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
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

  // Upload image to Supabase storage
  const uploadImage = async (): Promise<string> => {
    if (!uploadedImage) {
      return "";
    }

    try {
      // Create a unique file name
      const fileExt = uploadedImage.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `property-images/${fileName}`;

      // Upload the file with more detailed error handling
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("properties")
        .upload(filePath, uploadedImage, {
          cacheControl: "3600",
          upsert: true, // Changed to true to overwrite if file exists
        });

      if (uploadError) {
        console.error("Upload error details:", uploadError);
        throw uploadError;
      }

      // Get the public URL
      const { data } = supabase.storage
        .from("properties")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      // Return default image URL instead of throwing error
      return "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80";
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
      // First upload the image if available
      let imageUrl =
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"; // Default fallback

      if (uploadedImage) {
        try {
          imageUrl = await uploadImage();
        } catch (uploadError) {
          console.error(
            "Image upload failed, using default image",
            uploadError,
          );
          // Continue with default image if upload fails
        }
      }

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
            imageUrl: imageUrl,
            user_id: user.id,
          },
        ])
        .select();

      if (error) {
        console.error("Database insertion error:", error);
        throw error;
      }

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
      navigate("/browse-properties");
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
            <Label>Property Image</Label>
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
                className="hidden"
                onChange={handleFileChange}
              />

              {!imagePreview ? (
                <div className="flex flex-col items-center justify-center text-center">
                  <ImageIcon className="h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Drag and drop your image here
                  </p>
                  <p className="text-xs text-gray-500">
                    or click to browse files
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    JPEG, PNG, or GIF up to 5MB
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImagePreview("");
                      setUploadedImage(null);
                    }}
                    className="absolute top-2 right-2 bg-gray-800 bg-opacity-70 rounded-full p-1 text-white hover:bg-opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <img
                    src={imagePreview}
                    alt="Property preview"
                    className="w-full h-48 object-cover rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    {uploadedImage?.name} (
                    {Math.round(uploadedImage?.size / 1024)} KB)
                  </p>
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
              Thanks, Go to Listings
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
