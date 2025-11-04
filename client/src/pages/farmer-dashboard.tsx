import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Package, 
  TrendingUp, 
  ShoppingBag,
  Edit,
  MapPin,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Listing, OrderWithDetails } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function FarmerDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: listings, isLoading: listingsLoading } = useQuery<Listing[]>({
    queryKey: ["/api/farmer/listings"],
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/farmer/orders"],
  });

  const activeListings = listings?.filter(l => l.status === "active") || [];
  const totalRevenue = orders
    ?.filter(o => o.status === "completed")
    .reduce((sum, o) => sum + Number(o.totalPrice), 0) || 0;
  const pendingOrders = orders?.filter(o => o.status === "pending") || [];

  const getOrderStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "secondary" as const, icon: Clock, label: "Pending" },
      accepted: { variant: "default" as const, icon: CheckCircle, label: "Accepted" },
      rejected: { variant: "destructive" as const, icon: XCircle, label: "Rejected" },
      completed: { variant: "default" as const, icon: CheckCircle, label: "Completed" },
    };
    const config = variants[status as keyof typeof variants] || variants.pending;
    return (
      <Badge variant={config.variant} className="gap-1">
        <config.icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Farmer Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {user?.fullName}
            </p>
          </div>
          <Button onClick={() => setLocation("/farmer/create-listing")} size="lg" data-testid="button-create-listing">
            <Plus className="h-5 w-5 mr-2" />
            Create Listing
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Listings</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="stat-active-listings">
                    {listingsLoading ? "-" : activeListings.length}
                  </p>
                </div>
                <Package className="h-12 w-12 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Orders</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="stat-pending-orders">
                    {ordersLoading ? "-" : pendingOrders.length}
                  </p>
                </div>
                <ShoppingBag className="h-12 w-12 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="stat-revenue">
                    ${totalRevenue.toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="h-12 w-12 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="listings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="listings" data-testid="tab-listings">My Listings</TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="listings">
            {listingsLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <Skeleton className="h-48 w-full" />
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : listings && listings.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <Card key={listing.id} className="hover-elevate" data-testid={`card-listing-${listing.id}`}>
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      {listing.imageUrl ? (
                        <img 
                          src={listing.imageUrl} 
                          alt={listing.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="h-16 w-16 text-muted-foreground" />
                      )}
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-lg line-clamp-1">
                          {listing.productName}
                        </h3>
                        <Badge variant={listing.status === "active" ? "default" : "secondary"}>
                          {listing.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Price</span>
                          <span className="font-semibold text-primary">
                            ${listing.price}/{listing.unit}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Available</span>
                          <span className="font-semibold">
                            {listing.quantityAvailable} {listing.unit}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="line-clamp-1">{listing.location}</span>
                        </div>
                      </div>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setLocation(`/farmer/edit-listing/${listing.id}`)}
                        data-testid={`button-edit-${listing.id}`}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Listing
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12">
                <div className="text-center space-y-4">
                  <Package className="h-16 w-16 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-semibold">No listings yet</h3>
                  <p className="text-muted-foreground">
                    Create your first listing to start selling
                  </p>
                  <Button onClick={() => setLocation("/farmer/create-listing")} data-testid="button-create-first">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Listing
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="orders">
            {ordersLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-24 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : orders && orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="hover-elevate" data-testid={`card-order-${order.id}`}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">
                              {order.listing.productName}
                            </h3>
                            {getOrderStatusBadge(order.status)}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Buyer: {order.buyer.fullName}</p>
                            <p>Quantity: {order.quantity} {order.listing.unit}</p>
                            {order.deliveryAddress && (
                              <p>Delivery: {order.deliveryAddress}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="text-2xl font-bold text-primary">
                              ${order.totalPrice}
                            </p>
                          </div>
                          {order.status === "pending" && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="default" data-testid={`button-accept-${order.id}`}>
                                Accept
                              </Button>
                              <Button size="sm" variant="destructive" data-testid={`button-reject-${order.id}`}>
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12">
                <div className="text-center space-y-4">
                  <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-semibold">No orders yet</h3>
                  <p className="text-muted-foreground">
                    Your orders will appear here when buyers place them
                  </p>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
