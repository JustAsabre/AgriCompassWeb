import { useAuth } from "@/lib/auth";
import { Redirect } from "wouter";
import { FullPageLoader } from "@/components/ui/loader";
import Landing from "./landing";
import FarmerLanding from "./farmer-landing";
import BuyerLanding from "./buyer-landing";
import OfficerLanding from "./officer-landing";
import AdminLanding from "./admin-landing";

/**
 * Role-based landing page router
 * Displays different landing pages based on user authentication and role
 */
export default function RoleLanding() {
  const { user, isLoading } = useAuth();

  // Show loader while checking authentication
  if (isLoading) {
    return <FullPageLoader />;
  }

  // Unauthenticated users see the public landing page
  if (!user) {
    return <Landing />;
  }

  // Route to role-specific landing pages
  switch (user.role) {
    case "farmer":
      return <FarmerLanding />;
    case "buyer":
      return <BuyerLanding />;
    case "field_officer":
      return <OfficerLanding />;
    case "admin":
      return <AdminLanding />;
    default:
      // Fallback to public landing for unknown roles
      return <Landing />;
  }
}
