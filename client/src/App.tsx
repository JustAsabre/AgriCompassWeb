import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Header } from "@/components/header";

// Pages
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Marketplace from "@/pages/marketplace";
import ProductDetail from "@/pages/product-detail";
import FarmerDashboard from "@/pages/farmer-dashboard";
import BuyerDashboard from "@/pages/buyer-dashboard";
import OfficerDashboard from "@/pages/officer-dashboard";
import CreateListing from "@/pages/create-listing";
import Cart from "@/pages/cart";
import Profile from "@/pages/profile";
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
          <Route path="/marketplace" component={Marketplace} />
          <Route path="/marketplace/:id" component={ProductDetail} />
          
          {/* Farmer Routes */}
          <Route path="/farmer/dashboard">
            {() => <ProtectedRoute component={FarmerDashboard} allowedRoles={["farmer"]} />}
          </Route>
          <Route path="/farmer/create-listing">
            {() => <ProtectedRoute component={CreateListing} allowedRoles={["farmer"]} />}
          </Route>
          
          {/* Buyer Routes */}
          <Route path="/buyer/dashboard">
            {() => <ProtectedRoute component={BuyerDashboard} allowedRoles={["buyer"]} />}
          </Route>
          <Route path="/buyer/cart">
            {() => <ProtectedRoute component={Cart} allowedRoles={["buyer"]} />}
          </Route>
          
          {/* Field Officer Routes */}
          <Route path="/officer/dashboard">
            {() => <ProtectedRoute component={OfficerDashboard} allowedRoles={["field_officer"]} />}
          </Route>
          
          {/* Profile */}
          <Route path="/profile">
            {() => <ProtectedRoute component={Profile} />}
          </Route>
          
          {/* 404 */}
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
