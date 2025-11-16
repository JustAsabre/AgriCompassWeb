import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileUpload } from "@/components/ui/file-upload";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { ShieldCheck, Upload, CheckCircle, AlertCircle } from "lucide-react";
import type { Verification } from "@shared/schema";

interface VerificationFormData {
  farmSize: string;
  farmLocation: string;
  experienceYears: string;
  additionalInfo: string;
}

export default function VerificationRequest() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<VerificationFormData>();

  // Check if user already has a verification request
  const { data: existingVerification } = useQuery<Verification>({
    queryKey: ["/api/verifications/me"],
    enabled: !!user && user.role === "farmer",
  });

  const verificationMutation = useMutation({
    mutationFn: async (data: VerificationFormData & { documentUrl?: string }) => {
      const response = await fetch("/api/verifications/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit verification request");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Verification Request Submitted",
        description: "Your verification request has been submitted successfully. A field officer will review it soon.",
      });
      setLocation("/farmer-dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
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
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const urls = data.files.map((f: any) => f.url);
      setUploadedDocuments(prev => [...prev, ...urls]);

      toast({
        title: "Documents Uploaded",
        description: `${files.length} document(s) uploaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload documents. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = (data: VerificationFormData) => {
    verificationMutation.mutate({
      ...data,
      documentUrl: uploadedDocuments[0], // Use first uploaded document
    });
  };

  if (user?.role !== "farmer") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only farmers can submit verification requests.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (user?.verified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <CardTitle>Already Verified</CardTitle>
            </div>
            <CardDescription>
              Your farmer account is already verified.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/farmer-dashboard")} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (existingVerification) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
              <CardTitle>Verification Pending</CardTitle>
            </div>
            <CardDescription>
              Your verification request is currently being reviewed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Status</Label>
              <p className="capitalize font-medium">{existingVerification.status}</p>
            </div>
            {existingVerification.notes && (
              <div>
                <Label className="text-sm text-muted-foreground">Notes</Label>
                <p>{existingVerification.notes}</p>
              </div>
            )}
            <Button onClick={() => setLocation("/farmer-dashboard")} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <CardTitle>Farmer Verification Request</CardTitle>
            </div>
            <CardDescription>
              Submit your information to get verified as a farmer. Verified farmers gain more trust from buyers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="farmSize">Farm Size</Label>
                <Input
                  id="farmSize"
                  placeholder="e.g., 5 hectares, 10 acres"
                  {...register("farmSize", { required: "Farm size is required" })}
                />
                {errors.farmSize && (
                  <p className="text-sm text-destructive">{errors.farmSize.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="farmLocation">Farm Location</Label>
                <Input
                  id="farmLocation"
                  placeholder="Address or coordinates"
                  {...register("farmLocation", { required: "Farm location is required" })}
                />
                {errors.farmLocation && (
                  <p className="text-sm text-destructive">{errors.farmLocation.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="experienceYears">Years of Farming Experience</Label>
                <Input
                  id="experienceYears"
                  type="number"
                  placeholder="e.g., 5"
                  {...register("experienceYears", { 
                    required: "Experience is required",
                    min: { value: 0, message: "Must be 0 or greater" }
                  })}
                />
                {errors.experienceYears && (
                  <p className="text-sm text-destructive">{errors.experienceYears.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalInfo">Additional Information</Label>
                <Textarea
                  id="additionalInfo"
                  placeholder="Tell us about your farm, crops, livestock, certifications, etc."
                  rows={4}
                  {...register("additionalInfo")}
                />
              </div>

              <div className="space-y-2">
                <Label>Supporting Documents (Optional)</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Upload photos of your farm, land ownership documents, or certifications
                </p>
                <FileUpload
                  onChange={handleImageUpload}
                  maxFiles={3}
                  accept="image/*,.pdf"
                />
                {uploadedDocuments.length > 0 && (
                  <Alert>
                    <Upload className="h-4 w-4" />
                    <AlertDescription>
                      {uploadedDocuments.length} document(s) uploaded successfully
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/farmer-dashboard")}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={verificationMutation.isPending || isUploading}
                  className="flex-1"
                >
                  {verificationMutation.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
