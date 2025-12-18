import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Sprout, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { fadeIn } from "@/lib/animations";

type VerificationStatus = "loading" | "success" | "error" | "expired";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<VerificationStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Get token from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setErrorMessage("No verification token provided.");
        return;
      }

      try {
        const response = await apiRequest("GET", `/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        setStatus("success");
        toast({
          title: "Email Verified!",
          description: response.message || "Your email has been verified successfully.",
        });
      } catch (error: any) {
        const message = error.message || "Verification failed";
        if (message.toLowerCase().includes("expired")) {
          setStatus("expired");
        } else {
          setStatus("error");
        }
        setErrorMessage(message);
        toast({
          title: "Verification Failed",
          description: message,
          variant: "destructive",
        });
      }
    };

    verifyEmail();
  }, [token, toast]);

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <>
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <CardTitle className="text-2xl font-bold">Verifying Your Email</CardTitle>
            <CardDescription className="text-base">
              Please wait while we verify your email address...
            </CardDescription>
          </>
        );

      case "success":
        return (
          <>
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-600 dark:text-green-400">
              Email Verified!
            </CardTitle>
            <CardDescription className="text-base">
              Your email has been verified successfully. You can now log in to your account.
            </CardDescription>
          </>
        );

      case "expired":
        return (
          <>
            <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
              <XCircle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              Link Expired
            </CardTitle>
            <CardDescription className="text-base">
              This verification link has expired. Please request a new one.
            </CardDescription>
          </>
        );

      case "error":
      default:
        return (
          <>
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400">
              Verification Failed
            </CardTitle>
            <CardDescription className="text-base">
              {errorMessage || "We couldn't verify your email. The link may be invalid or expired."}
            </CardDescription>
          </>
        );
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

        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-4 text-center pb-2">
            {renderContent()}
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {status === "success" && (
              <Link href="/login">
                <Button className="w-full" size="lg">
                  Go to Login
                </Button>
              </Link>
            )}

            {(status === "expired" || status === "error") && (
              <div className="space-y-3">
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    Try Logging In
                  </Button>
                </Link>
                <p className="text-sm text-center text-muted-foreground">
                  If you need a new verification link, try logging in and we'll help you from there.
                </p>
              </div>
            )}

            {status === "loading" && (
              <p className="text-sm text-center text-muted-foreground">
                This should only take a moment...
              </p>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Need help?{" "}
          <Link href="/contact">
            <a className="text-primary hover:underline">Contact Support</a>
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
