import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import { UserWithRating } from "@shared/schema";
import { 
  Mail, Phone, MapPin, ShieldCheck, Building, Sprout, 
  User, Lock, Trash2, Eye, EyeOff, Save, Loader2, CheckCircle2
} from "lucide-react";
import { RatingStars } from "@/components/rating-stars";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { fadeInUp, scaleIn, staggerContainer, staggerItem, cardHover } from "@/lib/animations";

// Validation schemas
const profileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  region: z.string().min(1, "Region is required"),
  businessName: z.string().optional(),
  farmSize: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      phone: user?.phone || "",
      region: user?.region || "",
      businessName: user?.businessName || "",
      farmSize: user?.farmSize || "",
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return apiRequest("PATCH", "/api/user/profile", data);
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      return apiRequest("POST", "/api/user/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been successfully changed. A confirmation email has been sent.",
      });
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/user/deactivate");
    },
    onSuccess: () => {
      toast({
        title: "Account Deactivated",
        description: "Your account has been deactivated. You will be logged out.",
      });
      // Redirect to logout after a short delay
      setTimeout(() => {
        window.location.href = "/api/logout";
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Deactivation Failed",
        description: error.message || "Failed to deactivate account",
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return null;
  }

  const currentUser = user as UserWithRating;

  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordFormData) => {
    changePasswordMutation.mutate(data);
  };

  return (
    <motion.div 
      className="min-h-screen bg-gradient-subtle"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.h1 
          className="text-3xl md:text-4xl font-bold text-foreground mb-8"
          variants={fadeInUp}
        >
          Profile Settings
        </motion.h1>

        {/* Profile Header Card */}
        <motion.div variants={fadeInUp}>
          <Card className="mb-6 overflow-hidden">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Avatar className="h-24 w-24 ring-4 ring-primary/10">
                    <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                      {user.fullName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold" data-testid="text-name">
                        {user.fullName}
                      </h2>
                      {currentUser.verified && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", delay: 0.3 }}
                        >
                          <Badge variant="secondary" className="gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Verified
                          </Badge>
                        </motion.div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {user.role.replace("_", " ").toUpperCase()}
                    </Badge>
                    
                    {currentUser.role === "farmer" && currentUser.averageRating && currentUser.reviewCount && currentUser.reviewCount > 0 && (
                      <div className="mt-3">
                        <RatingStars 
                          rating={currentUser.averageRating} 
                          reviewCount={currentUser.reviewCount}
                          size="lg"
                        />
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span data-testid="text-email">{currentUser.email}</span>
                    </div>
                    {currentUser.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{currentUser.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span data-testid="text-region">{currentUser.region}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs Section */}
        <motion.div variants={scaleIn}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="personal" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Personal Info</span>
                <span className="sm:hidden">Info</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <span className="hidden sm:inline">Security</span>
                <span className="sm:hidden">Security</span>
              </TabsTrigger>
              <TabsTrigger value="account" className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Account</span>
                <span className="sm:hidden">Account</span>
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              {/* Personal Info Tab */}
              <TabsContent value="personal" className="mt-0">
                <motion.div
                  key="personal"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>
                        Update your personal details and contact information
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                        <motion.div 
                          className="grid gap-4 md:grid-cols-2"
                          variants={staggerContainer}
                          initial="hidden"
                          animate="visible"
                        >
                          <motion.div variants={staggerItem} className="space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input
                              id="fullName"
                              {...profileForm.register("fullName")}
                              placeholder="Enter your full name"
                            />
                            {profileForm.formState.errors.fullName && (
                              <p className="text-sm text-destructive">
                                {profileForm.formState.errors.fullName.message}
                              </p>
                            )}
                          </motion.div>

                          <motion.div variants={staggerItem} className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                              id="phone"
                              {...profileForm.register("phone")}
                              placeholder="Enter your phone number"
                            />
                          </motion.div>

                          <motion.div variants={staggerItem} className="space-y-2">
                            <Label htmlFor="region">Region</Label>
                            <Input
                              id="region"
                              {...profileForm.register("region")}
                              placeholder="Enter your region"
                            />
                            {profileForm.formState.errors.region && (
                              <p className="text-sm text-destructive">
                                {profileForm.formState.errors.region.message}
                              </p>
                            )}
                          </motion.div>

                          {currentUser.role === "buyer" && (
                            <motion.div variants={staggerItem} className="space-y-2">
                              <Label htmlFor="businessName">Business Name</Label>
                              <Input
                                id="businessName"
                                {...profileForm.register("businessName")}
                                placeholder="Enter your business name"
                              />
                            </motion.div>
                          )}

                          {currentUser.role === "farmer" && (
                            <motion.div variants={staggerItem} className="space-y-2">
                              <Label htmlFor="farmSize">Farm Size</Label>
                              <Input
                                id="farmSize"
                                {...profileForm.register("farmSize")}
                                placeholder="e.g., 5 acres, 10 hectares"
                              />
                            </motion.div>
                          )}
                        </motion.div>

                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button 
                            type="submit" 
                            disabled={updateProfileMutation.isPending}
                            className="w-full sm:w-auto"
                          >
                            {updateProfileMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                              </>
                            )}
                          </Button>
                        </motion.div>
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="mt-0">
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Change Password</CardTitle>
                      <CardDescription>
                        Update your password to keep your account secure
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                        <motion.div 
                          className="space-y-4"
                          variants={staggerContainer}
                          initial="hidden"
                          animate="visible"
                        >
                          <motion.div variants={staggerItem} className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <div className="relative">
                              <Input
                                id="currentPassword"
                                type={showCurrentPassword ? "text" : "password"}
                                {...passwordForm.register("currentPassword")}
                                placeholder="Enter your current password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              >
                                {showCurrentPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                            {passwordForm.formState.errors.currentPassword && (
                              <p className="text-sm text-destructive">
                                {passwordForm.formState.errors.currentPassword.message}
                              </p>
                            )}
                          </motion.div>

                          <motion.div variants={staggerItem} className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <div className="relative">
                              <Input
                                id="newPassword"
                                type={showNewPassword ? "text" : "password"}
                                {...passwordForm.register("newPassword")}
                                placeholder="Enter your new password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                              >
                                {showNewPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                            {passwordForm.formState.errors.newPassword && (
                              <p className="text-sm text-destructive">
                                {passwordForm.formState.errors.newPassword.message}
                              </p>
                            )}
                          </motion.div>

                          <motion.div variants={staggerItem} className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <div className="relative">
                              <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                {...passwordForm.register("confirmPassword")}
                                placeholder="Confirm your new password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                            {passwordForm.formState.errors.confirmPassword && (
                              <p className="text-sm text-destructive">
                                {passwordForm.formState.errors.confirmPassword.message}
                              </p>
                            )}
                          </motion.div>
                        </motion.div>

                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button 
                            type="submit" 
                            disabled={changePasswordMutation.isPending}
                            className="w-full sm:w-auto"
                          >
                            {changePasswordMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Changing Password...
                              </>
                            ) : (
                              <>
                                <Lock className="mr-2 h-4 w-4" />
                                Change Password
                              </>
                            )}
                          </Button>
                        </motion.div>
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              {/* Account Tab */}
              <TabsContent value="account" className="mt-0">
                <motion.div
                  key="account"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="border-destructive/50">
                    <CardHeader>
                      <CardTitle className="text-destructive">Danger Zone</CardTitle>
                      <CardDescription>
                        Irreversible and destructive actions
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-lg border border-destructive/30 p-4 bg-destructive/5">
                        <h4 className="font-medium mb-2">Deactivate Account</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Once you deactivate your account, you will be logged out and your account will be marked as inactive. 
                          You can contact support to reactivate your account if needed.
                        </p>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Button variant="destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Deactivate Account
                              </Button>
                            </motion.div>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action will deactivate your account. You will be logged out immediately 
                                and won't be able to access your account until you contact support for reactivation.
                                Your data will be preserved but your account will be inactive.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteAccountMutation.mutate()}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deleteAccountMutation.isPending ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deactivating...
                                  </>
                                ) : (
                                  "Yes, deactivate my account"
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </motion.div>
      </div>
    </motion.div>
  );
}
