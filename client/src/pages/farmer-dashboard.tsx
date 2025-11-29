import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Package,
  TrendingUp,
  ShoppingBag,
  Edit,
  Trash,
  MapPin,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Listing, OrderWithDetails } from "@shared/schema";
import { formatCurrency } from '@/lib/currency';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useRef } from "react";
import { useState } from "react";
import { Input } from '@/components/ui/input';
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EscrowStatus } from "@/components/escrow-status";
import { Escrow } from "@shared/schema";

export default function FarmerDashboard() {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [payoutAmount, setPayoutAmount] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [mobileNetwork, setMobileNetwork] = useState('');
  const [recipientMobileNetwork, setRecipientMobileNetwork] = useState('');
  const [recipientMobileNumber, setRecipientMobileNumber] = useState('');
  const recipientAccountRef = useRef<HTMLInputElement | null>(null);

  // Refresh user data on mount to ensure verified status is up to date
  useEffect(() => {
    refreshUser();
  }, []);

  const { data: listings, isLoading: listingsLoading } = useQuery<Listing[]>({
    queryKey: ["/api/farmer/listings", user?.id],
    enabled: !!user?.id,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/farmer/orders", user?.id],
    enabled: !!user?.id,
  });

  const { data: escrows } = useQuery<Escrow[]>({
    queryKey: ["/api/escrow"],
    enabled: !!user?.id,
  });



  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/farmer/orders", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/escrow"] });
      toast({
        title: "Order Updated",
        description: `Order status updated to ${variables.status} successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteListingMutation = useMutation({
    mutationFn: async (listingId: string) => {
      return apiRequest("DELETE", `/api/listings/${listingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/farmer/listings", user?.id] });
      toast({
        title: "Listing Deleted",
        description: "The listing has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createRecipientMutation = useMutation({
    mutationFn: async ({ mobileNumber, mobileNetwork, bankCode }: { mobileNumber: string; mobileNetwork: string; bankCode: string }) => {
      return apiRequest("POST", '/api/users/payout-settings', { mobileNumber, mobileNetwork, bankCode });
    },
    onSuccess: (data) => {
      refreshUser();
      toast({ title: 'Settings Saved', description: 'Payout settings updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async ({ amount }: { amount: string }) => {
      return apiRequest("POST", '/api/wallet/withdraw', { amount });
    },
    onSuccess: () => {
      refreshUser();
      toast({ title: 'Withdrawal Initiated', description: 'Your withdrawal request has been processed.' });
      setPayoutAmount('');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Client-side validation for Ghana mobile number E.164 or local
  function isValidGhanaMobile(mobile?: string) {
    if (!mobile) return false;
    const e164Regex = /^\+233[0-9]{9}$/;
    const localRegex = /^0[0-9]{9}$/;
    return e164Regex.test(mobile) || localRegex.test(mobile);
  }

  const activeListings = listings?.filter(l => l.status === "active") || [];
  const totalRevenue = orders
    ?.filter(o => o.status === "completed")
    .reduce((sum, o) => {
      const price = Number(o.totalPrice);
      return sum + (isNaN(price) ? 0 : price);
    }, 0) || 0;
  const pendingOrders = orders?.filter(o => o.status === "pending") || [];

  const getEscrowForOrder = (orderId: string) => {
    return escrows?.find(escrow => escrow.orderId === orderId);
  };

  const handleReportDispute = (orderId: string) => {
    // Navigate to order detail page where dispute can be filed
    setLocation(`/orders/${orderId}`);
  };

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
          <div className="flex gap-2">
            <Button onClick={() => setLocation("/farmer/analytics")} variant="outline" size="lg">
              <TrendingUp className="h-5 w-5 mr-2" />
              View Analytics
            </Button>
            <Button onClick={() => setLocation("/farmer/create-listing")} size="lg" data-testid="button-create-listing">
              <Plus className="h-5 w-5 mr-2" />
              Create Listing
            </Button>
          </div>
        </div>

        {/* Verification Alert */}
        {!user?.verified && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Get verified to build trust with buyers and increase your sales!
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/farmer/verification")}
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                Get Verified
              </Button>
            </AlertDescription>
          </Alert>
        )}

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
                    {formatCurrency(totalRevenue)}
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
                            {formatCurrency(listing.price)}/{listing.unit}
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

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setLocation(`/farmer/edit-listing/${listing.id}`)}
                          data-testid={`button-edit-${listing.id}`}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              data-testid={`button-delete-${listing.id}`}
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Listing?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{listing.productName}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteListingMutation.mutate(listing.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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
                            {getOrderStatusBadge(order.status ?? 'pending')}
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
                              {formatCurrency(order.totalPrice)}
                            </p>
                          </div>
                          {order.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => updateOrderMutation.mutate({ orderId: order.id, status: "accepted" })}
                                disabled={updateOrderMutation.isPending}
                                data-testid={`button-accept-${order.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateOrderMutation.mutate({ orderId: order.id, status: "rejected" })}
                                disabled={updateOrderMutation.isPending}
                                data-testid={`button-reject-${order.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                          {order.status === "accepted" && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => updateOrderMutation.mutate({ orderId: order.id, status: "delivered" })}
                              disabled={updateOrderMutation.isPending}
                              data-testid={`button-deliver-${order.id}`}
                            >
                              <Package className="h-4 w-4 mr-1" />
                              Mark as Delivered
                            </Button>
                          )}
                        </div>
                      </div>
                      {/* Escrow Status */}
                      {getEscrowForOrder(order.id) && (
                        <div className="mt-4">
                          <EscrowStatus
                            escrow={getEscrowForOrder(order.id)!}
                            onReportDispute={() => handleReportDispute(order.id)}
                          />
                        </div>
                      )}
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
        {!user?.paystackRecipientCode && (
          <div className="mb-4">
            <Alert>
              <AlertDescription className="flex items-center justify-between">
                <span>You haven't set up a payout recipient yet. Add your mobile money details to receive payouts automatically.</span>
                <Button size="sm" onClick={() => recipientAccountRef.current?.focus()}>Add Recipient</Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Wallet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-3xl font-bold text-primary">{formatCurrency(user?.walletBalance || 0)}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Input
                    placeholder="Amount to withdraw (GHS)"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    type="number"
                  />
                  <Button
                    onClick={() => {
                      if (!payoutAmount || Number(payoutAmount) <= 0) {
                        toast({ title: 'Invalid Amount', description: 'Please enter a valid amount', variant: 'destructive' });
                        return;
                      }
                      if (Number(payoutAmount) > Number(user?.walletBalance || 0)) {
                        toast({ title: 'Insufficient Funds', description: 'You cannot withdraw more than your balance', variant: 'destructive' });
                        return;
                      }
                      if (!user?.paystackRecipientCode) {
                        toast({ title: 'Setup Required', description: 'Please set up your payout details first', variant: 'destructive' });
                        return;
                      }
                      withdrawMutation.mutate({ amount: payoutAmount });
                    }}
                    disabled={withdrawMutation.isPending || !user?.paystackRecipientCode}
                    className="w-full"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Withdraw Funds
                  </Button>
                  {!user?.paystackRecipientCode && (
                    <p className="text-xs text-destructive">Set up payout details to withdraw.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payout Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Select value={recipientMobileNetwork} onValueChange={(v) => setRecipientMobileNetwork(v)}>
                    <SelectTrigger><SelectValue placeholder="Network" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mtn">MTN</SelectItem>
                      <SelectItem value="vodafone">Vodafone</SelectItem>
                      <SelectItem value="airteltigo">AirtelTigo</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Bank Code (e.g. MTN)"
                    value={mobileNetwork} // Reusing state var for bank code temporarily or I should add a new one? 
                    // Wait, createRecipientMutation expects bankCode. 
                    // I should probably map network to bank code or ask user.
                    // For mobile money, bank code is usually 'MTN', 'VOD', 'ATL'.
                    // I'll simplify and map it in the UI or let user select.
                    // Actually, the previous code had bank_code in the backend but UI only had network.
                    // I'll add a hidden mapping or just use network as bank code for now if valid.
                    // Let's assume network is the bank code for simplicity or add a mapping.
                    // MTN -> MTN, Vodafone -> VOD, AirtelTigo -> ATL
                    onChange={(e) => setMobileNetwork(e.target.value)}
                    className="hidden"
                  />
                </div>
                <Input
                  placeholder="Mobile Number (e.g. 024...)"
                  value={recipientMobileNumber}
                  onChange={(e) => setRecipientMobileNumber(e.target.value)}
                />
                <Button
                  onClick={() => {
                    if (!recipientMobileNumber || !recipientMobileNetwork) {
                      toast({ title: 'Missing Details', description: 'Please fill all fields', variant: 'destructive' });
                      return;
                    }
                    // Map network to bank code
                    const bankCodes: Record<string, string> = { 'mtn': 'MTN', 'vodafone': 'VOD', 'airteltigo': 'ATL' };
                    const code = bankCodes[recipientMobileNetwork] || 'MTN';
                    createRecipientMutation.mutate({
                      mobileNumber: recipientMobileNumber,
                      mobileNetwork: recipientMobileNetwork,
                      bankCode: code
                    });
                  }}
                  disabled={createRecipientMutation.isPending}
                  className="w-full"
                >
                  Save Payout Details
                </Button>

                {user?.paystackRecipientCode && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">Active Recipient Configured</p>
                    <p className="text-xs text-muted-foreground">Code: {user.paystackRecipientCode}</p>
                    <p className="text-xs text-muted-foreground">Mobile: {user.mobileNumber}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
