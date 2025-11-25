import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth";
import { NotificationProvider } from "@/lib/notifications";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

// Pages
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import TermsOfService from "@/pages/terms-of-service";
import PrivacyPolicy from "@/pages/privacy-policy";
import CookiePolicy from "@/pages/cookie-policy";
import About from "@/pages/about";
import Contact from "@/pages/contact";
import Marketplace from "@/pages/marketplace";
import ProductDetail from "@/pages/product-detail";
import FarmerDashboard from "@/pages/farmer-dashboard";
import BuyerDashboard from "@/pages/buyer-dashboard";
import OfficerDashboard from "@/pages/officer-dashboard";
import CreateListing from "@/pages/create-listing";
import Cart from "@/pages/cart";
import Profile from "@/pages/profile";
import VerificationRequest from "@/pages/verification-request";
import VerificationsList from "@/pages/verifications-list";
import Messages from "@/pages/messages";
import FarmerAnalytics from "@/pages/farmer-analytics";
import BuyerAnalytics from "@/pages/buyer-analytics";
import OfficerAnalytics from "@/pages/officer-analytics";
import OrderSuccess from "@/pages/order-success";
import OrderDetail from "@/pages/order-detail";
import AdminReviews from "@/pages/admin-reviews";
import AdminDashboard from "@/pages/admin-dashboard";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component, allowedRoles }: { component: any; allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1">
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/terms-of-service" component={TermsOfService} />
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route path="/cookie-policy" component={CookiePolicy} />
          <Route path="/about" component={About} />
          <Route path="/contact" component={Contact} />
          <Route path="/marketplace" component={Marketplace} />
          <Route path="/marketplace/:id" component={ProductDetail} />
          
          {/* Farmer Routes */}
          <Route path="/farmer/dashboard">
            {() => <ProtectedRoute component={FarmerDashboard} allowedRoles={["farmer"]} />}
          </Route>
          <Route path="/farmer/create-listing">
            {() => <ProtectedRoute component={CreateListing} allowedRoles={["farmer"]} />}
          </Route>
          <Route path="/farmer/edit-listing/:id">
            {() => <ProtectedRoute component={CreateListing} allowedRoles={["farmer"]} />}
          </Route>
          <Route path="/farmer/verification">
            {() => <ProtectedRoute component={VerificationRequest} allowedRoles={["farmer"]} />}
          </Route>
          <Route path="/farmer/analytics">
            {() => <ProtectedRoute component={FarmerAnalytics} allowedRoles={["farmer"]} />}
          </Route>
          
          {/* Buyer Routes */}
          <Route path="/buyer/dashboard">
            {() => <ProtectedRoute component={BuyerDashboard} allowedRoles={["buyer"]} />}
          </Route>
          <Route path="/buyer/cart">
            {() => <ProtectedRoute component={Cart} allowedRoles={["buyer"]} />}
          </Route>
          <Route path="/buyer/analytics">
            {() => <ProtectedRoute component={BuyerAnalytics} allowedRoles={["buyer"]} />}
          </Route>
          
          {/* Order Routes */}
          <Route path="/order-success">
            {() => <ProtectedRoute component={OrderSuccess} allowedRoles={["buyer"]} />}
          </Route>
          <Route path="/orders/:id">
            {() => <ProtectedRoute component={OrderDetail} allowedRoles={["buyer", "farmer"]} />}
          </Route>
          
          {/* Field Officer Routes */}
          <Route path="/officer/dashboard">
            {() => <ProtectedRoute component={OfficerDashboard} allowedRoles={["field_officer"]} />}
          </Route>
          <Route path="/officer/verifications">
            {() => <ProtectedRoute component={VerificationsList} allowedRoles={["field_officer"]} />}
          </Route>
          <Route path="/officer/analytics">
            {() => <ProtectedRoute component={OfficerAnalytics} allowedRoles={["field_officer"]} />}
          </Route>
          <Route path="/officer/reviews">
            {() => <ProtectedRoute component={AdminReviews} allowedRoles={["field_officer"]} />}
          </Route>
          
          {/* Profile */}
          <Route path="/profile">
            {() => <ProtectedRoute component={Profile} />}
          </Route>

          {/* Messages */}
          <Route path="/messages">
            {() => <ProtectedRoute component={Messages} />}
          </Route>
          
          {/* Admin Dashboard */}
          <Route path="/admin/dashboard">
            {() => <ProtectedRoute component={AdminDashboard} allowedRoles={["admin"]} />}
          </Route>
          {/* 404 */}
          <Route component={NotFound} />
        </Switch>
      </div>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <TooltipProvider>
              <Router />
              <Toaster />
            </TooltipProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
