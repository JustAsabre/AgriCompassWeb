import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { useToast } from "@/hooks/use-toast";
import { insertListingSchema } from "@shared/schema";
import { z } from "zod";
import { ChevronLeft, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  quantityAvailable: z.string().min(1, "Quantity is required"),
  minOrderQuantity: z.string().min(1, "Minimum order is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateListing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: "",
      category: "",
      description: "",
      price: "",
      unit: "kg",
      quantityAvailable: "",
      minOrderQuantity: "",
      harvestDate: "",
      location: "",
      imageUrl: "",
      farmerId: "", // Will be set by backend
    },
  });

  const createListingMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/listings", data);
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your listing has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/farmer/listings"] });
      setLocation("/farmer/dashboard");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create listing. Please try again.",
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

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const urls = data.files.map((f: any) => f.url);
      setUploadedImages(prev => [...prev, ...urls]);
      
      // Set first image as the main imageUrl
      if (uploadedImages.length === 0 && urls.length > 0) {
        form.setValue('imageUrl', urls[0]);
      }

      toast({
        title: "Success",
        description: `${files.length} image(s) uploaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to upload images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    // Use first uploaded image if no URL specified
    const imageUrl = data.imageUrl || (uploadedImages.length > 0 ? uploadedImages[0] : '');
    
    createListingMutation.mutate({
      ...data,
      imageUrl,
      price: data.price,
      quantityAvailable: parseInt(data.quantityAvailable),
      minOrderQuantity: parseInt(data.minOrderQuantity),
    });
  };

  return (
    <div className="min-h-screen bg-background">
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
            <CardTitle className="text-2xl md:text-3xl">Create New Listing</CardTitle>
            <CardDescription>
              Add a new product to the marketplace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Fresh Tomatoes" {...field} data-testid="input-product-name" />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    onChange={handleImageUpload}
                    maxFiles={5}
                    maxSize={5}
                    disabled={isUploading}
                  />
                  {isUploading && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Uploading images...</span>
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
                          value={field.value ?? ""}
                          data-testid="input-image-url"
                        />
                      </FormControl>
                      <FormDescription>
                        Or upload images above, or provide a URL to an image
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
                    disabled={createListingMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createListingMutation.isPending ? "Creating..." : "Create Listing"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
