import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Sprout, AlertCircle, Mail } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { fadeIn } from "@/lib/animations";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [verificationError, setVerificationError] = useState<{ email: string } | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === "farmer") {
        setLocation("/farmer/dashboard");
      } else if (user.role === "buyer") {
        setLocation("/buyer/dashboard");
      } else if (user.role === "field_officer") {
        setLocation("/officer/dashboard");
      } else {
        setLocation("/");
      }
    }
  }, [user, authLoading, setLocation]);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/auth/login", data);
      
      // Check if email verification is required
      if (response.requiresVerification) {
        setVerificationError({ email: response.email || data.email });
        return;
      }
      
      login(response.user);

      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });

      // Redirect based on role
      if (response.user.role === "farmer") {
        setLocation("/farmer/dashboard");
      } else if (response.user.role === "buyer") {
        setLocation("/buyer/dashboard");
      } else if (response.user.role === "field_officer") {
        setLocation("/officer/dashboard");
      } else {
        setLocation("/");
      }
    } catch (error: any) {
      // Check if error response contains requiresVerification
      if (error.requiresVerification) {
        setVerificationError({ email: error.email || data.email });
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to login. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      className="min-h-screen flex items-center justify-center bg-gradient-subtle px-4 py-12"
      initial="hidden"
      animate="visible"
      variants={fadeIn}
    >
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/">
            <a className="inline-flex items-center gap-2 mb-6">
              <Sprout className="h-10 w-10 text-primary" />
              <span className="text-2xl font-bold text-foreground">Agricompass</span>
            </a>
          </Link>
        </div>

        {verificationError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Email Verification Required</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>Please verify your email address before logging in.</p>
              <p className="text-sm">We sent a verification link to <strong>{verificationError.email}</strong></p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setLocation(`/verify-email-pending?email=${encodeURIComponent(verificationError.email)}`)}
              >
                <Mail className="h-4 w-4 mr-2" />
                Resend Verification Email
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Login</CardTitle>
            <CardDescription>
              Enter your email and password to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="farmer@example.com"
                          {...field}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Password</FormLabel>
                        <Link href="/forgot-password">
                          <a className="text-sm text-primary hover:underline">
                            Forgot password?
                          </a>
                        </Link>
                      </div>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                          data-testid="input-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-submit"
                >
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href="/register">
                <a className="font-medium text-primary hover:underline" data-testid="link-register">
                  Sign up
                </a>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
