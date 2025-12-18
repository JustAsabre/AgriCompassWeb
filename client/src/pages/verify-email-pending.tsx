import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Sprout, Mail, RefreshCw, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { fadeIn } from "@/lib/animations";

export default function VerifyEmailPending() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Get email from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get("email") || "";

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || !email) return;
    
    setIsResending(true);
    try {
      await apiRequest("POST", "/api/auth/resend-verification", { email });
      toast({
        title: "Verification Email Sent",
        description: "If an account exists with this email, a new verification link has been sent.",
      });
      // Start 60 second cooldown
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend verification email.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
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
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription className="text-base">
              We've sent a verification link to
              {email && (
                <span className="block font-medium text-foreground mt-1">{email}</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                What to do next:
              </h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the verification link in the email</li>
                <li>Once verified, you can log in to your account</li>
              </ol>
            </div>

            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Didn't receive the email?
              </p>
              <Button 
                variant="outline" 
                onClick={handleResendVerification}
                disabled={isResending || resendCooldown > 0 || !email}
                className="w-full"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : resendCooldown > 0 ? (
                  `Resend in ${resendCooldown}s`
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend Verification Email
                  </>
                )}
              </Button>
            </div>

            <div className="pt-4 border-t text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Already verified?
              </p>
              <Link href="/login">
                <Button className="w-full">
                  Go to Login
                </Button>
              </Link>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              The verification link expires in 24 hours.
            </p>
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
