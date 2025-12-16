import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useIsMutating } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileUpload } from "@/components/ui/file-upload";
import { useToast } from "@/hooks/use-toast";
import { insertListingSchema, Listing } from "@shared/schema";
import { z } from "zod";
import { ChevronLeft, Loader2, X, Info } from "lucide-react";
import { apiRequest, queryClient, getCsrfToken } from "@/lib/queryClient";
import { PricingTierForm } from "@/components/pricing-tier-form";
import { motion } from "framer-motion";
import { fadeIn } from "@/lib/animations";

const categories = [
  "Vegetables",
  "Fruits",
  "Grains",
  "Livestock",
  "Dairy",
  "Poultry",
  "Seeds",
  "Other"
];

const units = ["kg", "tons", "boxes", "pieces", "liters"];

const formSchema = insertListingSchema.extend({
  price: z.string().min(1, "Price is required"),
  quantityAvailable: z.coerce.number().int().positive("Quantity must be positive"),
  minOrderQuantity: z.coerce.number().int().positive("Minimum order must be positive"),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateListing() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/farmer/edit-listing/:id");
  const isEditMode = !!match && !!params?.id;
  const { toast } = useToast();
  useEffect(() => {
    // Clear any previously autofilled image url or values on mount only if creating new
    if (!isEditMode) {
      form.setValue('imageUrl', '');
    }
  }, [isEditMode]);
  const [isUploading, setIsUploading] = useState(false);

  // Track if any pricing tier mutations are in progress
  const pricingTierMutating = useIsMutating({
    predicate: (mutation) =>
      mutation.options.mutationKey?.[0]?.toString().includes('pricing-tiers') ?? false
  });

  // Fetch existing listing if in edit mode
  const { data: existingListing, isLoading: isLoadingListing, error: loadingError } = useQuery<any>({
    queryKey: [`/api/listings/${params?.id}`],
    enabled: isEditMode && !!params?.id,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: "",
      category: "",
      description: "",
      price: "",
      unit: "kg",
      quantityAvailable: 0,
      minOrderQuantity: 0,
      harvestDate: "",
      location: "",
      imageUrl: "",
      farmerId: "", // Will be set by backend
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (isEditMode && existingListing) {
      form.reset({
        productName: existingListing.productName || "",
        category: existingListing.category || "",
        description: existingListing.description || "",
        price: existingListing.price ? String(existingListing.price) : "",
        unit: existingListing.unit || "kg",
        quantityAvailable: existingListing.quantityAvailable 
          ? (typeof existingListing.quantityAvailable === 'number' 
              ? existingListing.quantityAvailable 
              : parseInt(String(existingListing.quantityAvailable), 10))
          : 0,
        minOrderQuantity: existingListing.minOrderQuantity
          ? (typeof existingListing.minOrderQuantity === 'number'
              ? existingListing.minOrderQuantity
              : parseInt(String(existingListing.minOrderQuantity), 10))
          : 0,
        harvestDate: existingListing.harvestDate || "",
        location: existingListing.location || "",
        imageUrl: existingListing.imageUrl || "",
        farmerId: existingListing.farmerId || "",
      });
    }
  }, [isEditMode, existingListing, form]);

  // Track imageUrl value from the form in a single variable to avoid calling watch repeatedly
  const imageUrlValue = form.watch('imageUrl');
  const normalizedImageValue: string | string[] | undefined = (() => {
    if (!imageUrlValue) return undefined;
    if (Array.isArray(imageUrlValue)) return imageUrlValue.filter(Boolean) as string[];
    return String(imageUrlValue);
  })();

  const createListingMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditMode && params?.id) {
        return apiRequest("PATCH", `/api/listings/${params.id}`, data);
      }
      return apiRequest("POST", "/api/listings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(); // Global invalidation for instant updates
      toast({
        title: "Success!",
        description: isEditMode
          ? "Your listing has been updated successfully."
          : "Your listing has been created and is pending admin approval. It will be visible to buyers once approved.",
      });
      setLocation("/farmer/dashboard");
    },
    onError: () => {
      toast({
        title: "Error",
        description: isEditMode
          ? "Failed to update listing. Please try again."
          : "Failed to create listing. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('images', file));

      const token = await getCsrfToken();
      const headers: Record<string, string> = {};
      if (token) headers['X-CSRF-Token'] = token;

      // In production (Vercel), use relative URLs to go through Vercel's proxy
      // In development, use VITE_API_URL to talk directly to backend
      const API_BASE_URL = import.meta.env.DEV 
        ? (import.meta.env.VITE_API_URL || 'http://localhost:5000')
        : ''; // Empty string for relative URLs in production
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Upload failed');
      }

      const data = await response.json();
      const url = data.files[0].url;

      // Set the uploaded image URL directly in the form
      form.setValue('imageUrl', url, { shouldValidate: true, shouldDirty: true });

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error: any) {
      console.error('Image upload error:', error);
      toast({
        title: "Upload Error",
        description: error.message || "Failed to upload images. Please check file format and size.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    // Check if pricing tier operations are in progress
    if (pricingTierMutating > 0) {
      toast({
        title: "Please Wait",
        description: "Pricing tier operations are in progress. Please wait for them to complete.",
        variant: "destructive",
      });
      return;
    }

    // Validate that numeric fields are not empty
    if (!data.price || !data.quantityAvailable || !data.minOrderQuantity) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Server schema expects: price as string (decimal), quantities as numbers (integer)
    const submitData = {
      ...data,
      price: String(data.price),
      quantityAvailable: parseInt(String(data.quantityAvailable), 10),
      minOrderQuantity: parseInt(String(data.minOrderQuantity), 10),
    };

    createListingMutation.mutate(submitData);
  };

  if (isEditMode && isLoadingListing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div 
      className="min-h-screen bg-gradient-subtle"
      initial="hidden"
      animate="visible"
      variants={fadeIn}
    >
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => setLocation("/farmer/dashboard")}
          className="mb-6"
          data-testid="button-back"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">
              {isEditMode ? "Edit Listing" : "Create New Listing"}
            </CardTitle>
            <CardDescription>
              {isEditMode
                ? "Update your product information"
                : "List your agricultural products for buyers"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isEditMode && (
              <Alert className="mb-6 border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>Admin Approval Required:</strong> New listings will be reviewed by our admin team before appearing on the marketplace. This helps maintain quality and trust in our platform.
                </AlertDescription>
              </Alert>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Fresh Tomatoes" {...field} data-testid="input-product-name" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your product, quality, growing methods, etc."
                          className="min-h-32"
                          {...field}
                          data-testid="input-description"
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormDescription>
                        Provide detailed information about your product
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            data-testid="input-price"
                            autoComplete="off"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-unit">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {units.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quantityAvailable"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity Available</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="100"
                            {...field}
                            data-testid="input-quantity"
                            autoComplete="off"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minOrderQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Order Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="10"
                            {...field}
                            data-testid="input-moq"
                            autoComplete="off"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="harvestDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Harvest Date (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., January 2024"
                            {...field}
                            value={field.value ?? ""}
                            data-testid="input-harvest-date"
                            autoComplete="off"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., North Region"
                            {...field}
                            data-testid="input-location"
                            autoComplete="off"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Image Upload Section */}
                <div className="space-y-4">
                  <FormLabel>Product Images</FormLabel>
                  <FileUpload
                    value={normalizedImageValue}
                    onChange={handleImageUpload}
                    accept="image/*"
                    maxFiles={1}
                    maxSize={5}
                    disabled={isUploading}
                  />
                  {isUploading && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Uploading image...</span>
                    </div>
                  )}

                  {/* Image Preview */}
                  {imageUrlValue && !isUploading && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Uploaded Image:</p>
                      <div className="relative group aspect-video max-w-md rounded-lg overflow-hidden border">
                        <img
                          src={Array.isArray(imageUrlValue) ? imageUrlValue[0] : imageUrlValue ?? undefined}
                          alt="Product preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 flex gap-2">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              form.setValue('imageUrl', '', { shouldValidate: true, shouldDirty: true });
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL (Alternative)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/image.jpg"
                          {...field}
                          value={field.value || ''}
                          data-testid="input-image-url"
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormDescription>
                        Upload an image above, or provide a URL to an image
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/farmer/dashboard")}
                    className="flex-1"
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createListingMutation.isPending || pricingTierMutating > 0}
                    data-testid="button-submit"
                  >
                    {createListingMutation.isPending
                      ? (isEditMode ? "Updating..." : "Creating...")
                      : pricingTierMutating > 0
                        ? "Wait for tier operations..."
                        : (isEditMode ? "Update Listing" : "Create Listing")}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Pricing Tiers Section - Only show after listing is created (edit mode) */}
        {isEditMode && params?.id && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Bulk Pricing Tiers</CardTitle>
              <CardDescription>
                Offer discounts for larger orders to incentivize bulk purchases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PricingTierForm
                listingId={params.id}
                basePrice={Number(form.watch('price') ?? 0)}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </motion.div>
  );
}
