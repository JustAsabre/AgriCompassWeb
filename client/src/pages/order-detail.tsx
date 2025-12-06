import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Download, 
  MessageCircle, 
  Package, 
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { ReviewForm } from "@/components/review-form";
import { ReviewDisplay } from "@/components/review-display";
import { EscrowStatus } from "@/components/escrow-status";
import { Escrow } from "@shared/schema";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  fadeInUp,
  staggerContainer,
  staggerItem
} from "@/lib/animations";

interface OrderDetail {
  id: string;
  buyerId: string;
  farmerId: string;
  listingId: string;
  quantity: number;
  totalPrice: string;
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled" | "delivered";
  deliveryAddress?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  listing: {
    productName: string;
    category: string;
    pricePerUnit: string;
    unit: string;
    imageUrl?: string;
  };
  farmer: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber?: string;
    region: string;
  };
  buyer: {
    id: string;
    fullName: string;
    email: string;
  };
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    bgColor: "bg-yellow-500/10",
    label: "Pending Review",
  },
  accepted: {
    icon: CheckCircle,
    color: "bg-blue-500",
    textColor: "text-blue-600",
    bgColor: "bg-blue-500/10",
    label: "Accepted",
  },
  delivered: {
    icon: Package,
    color: "bg-purple-500",
    textColor: "text-purple-600",
    bgColor: "bg-purple-500/10",
    label: "Delivered",
  },
  completed: {
    icon: CheckCircle,
    color: "bg-green-500",
    textColor: "text-green-600",
    bgColor: "bg-green-500/10",
    label: "Completed",
  },
  rejected: {
    icon: XCircle,
    color: "bg-red-500",
    textColor: "text-red-600",
    bgColor: "bg-red-500/10",
    label: "Rejected",
  },
  cancelled: {
    icon: AlertCircle,
    color: "bg-gray-500",
    textColor: "text-gray-600",
    bgColor: "bg-gray-500/10",
    label: "Cancelled",
  },
};

export default function OrderDetail() {
  const [match, params] = useRoute("/orders/:id");
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: order, isLoading } = useQuery<OrderDetail>({
    queryKey: [`/api/orders/${params?.id}`],
    enabled: !!params?.id,
    // Removed polling - global invalidation on mutations provides instant updates
  });

  const { data: paymentsResponse } = useQuery<{ payments: any[] } | undefined>({
    queryKey: [`/api/payments/order/${params?.id}`],
    enabled: !!params?.id,
    // Removed polling - global invalidation on mutations provides instant updates
  });
  const payments = paymentsResponse?.payments ?? [];

  const { data: escrow } = useQuery<Escrow>({
    queryKey: [`/api/escrow/order/${params?.id}`],
    enabled: !!params?.id,
    // Removed polling - global invalidation on mutations provides instant updates
  });

  // Check if review exists for this order
  const { data: existingReview } = useQuery<{
    id: string;
    rating: number;
    comment?: string;
    createdAt: string;
  }>({
    queryKey: [`/api/reviews/order/${params?.id}`],
    enabled: !!params?.id && order?.status === "completed",
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/orders/${params?.id}`, { status: "cancelled" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(); // Global invalidation for instant updates
      toast({
        title: "Order cancelled",
        description: "Your order has been cancelled successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel order",
        variant: "destructive",
      });
    },
  });

  const markAsDeliveredMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/orders/${params?.id}/status`, { status: "delivered" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(); // Global invalidation for instant updates
      toast({
        title: "Order marked as delivered",
        description: "Buyer has been notified to confirm receipt.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark as delivered",
        variant: "destructive",
      });
    },
  });

  const confirmReceiptMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/orders/${params?.id}/complete`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries(); // Global invalidation for instant updates
      toast({
        title: "Order completed",
        description: "Thank you for confirming receipt!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete order",
        variant: "destructive",
      });
    },
  });

  const initiatePaymentMutation = useMutation({
    mutationFn: async () => {
      const retUrl = window.location.href;
      return apiRequest("POST", "/api/payments/initiate", { orderId: order?.id, paymentMethod: 'paystack', returnUrl: retUrl });
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries(); // Global invalidation for instant updates
      // If using Paystack, the response may include an authorization_url; redirect the buyer to Paystack
      const d: any = response;
      if (d && typeof d === 'object') {
        const authorization_url = d?.authorization_url || d?.payment?.authorization_url || d?.payment?.authorization_url;
        if (authorization_url) {
          window.location.href = authorization_url;
          return;
        }
      }
      toast({ title: 'Payment Initiated', description: 'Payment record created. Please complete payment with the instructions provided.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Payment Error', description: error.message || 'Failed to initiate payment', variant: 'destructive' });
    }
  });

  // Dispute reporting
  const [disputeReason, setDisputeReason] = useState("");
  const [isDisputeDialogOpen, setIsDisputeDialogOpen] = useState(false);

  const reportDisputeMutation = useMutation({
    mutationFn: async (reason: string) => {
      if (!escrow?.id) throw new Error("No escrow found");
      return apiRequest("POST", `/api/escrow/${escrow.id}/dispute`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(); // Global invalidation for instant updates
      setIsDisputeDialogOpen(false);
      setDisputeReason("");
      toast({
        title: "Dispute Reported",
        description: "Your dispute has been submitted and will be reviewed by our team.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to report dispute",
        variant: "destructive",
      });
    },
  });

  // Auto-verify after Paystack redirect if reference query param is present
  useEffect(() => {
    if (!params?.id) return;
    const url = new URL(window.location.href);
    const reference = url.searchParams.get('reference') || url.searchParams.get('paystack_ref');
    if (!reference) return;
    // Ask the server to verify the reference (client-side verification)
    (async () => {
      try {
        await apiRequest('POST', '/api/payments/paystack/verify-client', { reference });
        await queryClient.invalidateQueries({ queryKey: ["/api/orders/", params?.id] });
        await queryClient.invalidateQueries({ queryKey: [`/api/payments/order/${params?.id}`] });
        toast({ title: 'Payment verified', description: 'Payment has been verified successfully' });
        // Clean up url parameters to avoid repeated verification
        url.searchParams.delete('reference');
        url.searchParams.delete('paystack_ref');
        window.history.replaceState({}, '', url.toString());
      } catch (err) {
        // ignore; user can retry
      }
    })();
  }, [params?.id]);

  if (!match || !params?.id) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
            <p className="text-muted-foreground mb-4">
              We couldn't find the order you're looking for.
            </p>
            <Button onClick={() => setLocation('/buyer/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = statusConfig[order.status];
  const StatusIcon = statusInfo.icon;
  const canCancel = order.status === "pending";
  const hasCompletedPayment = (payments).some((p: any) => p.status === 'completed');
  const canMarkDelivered = user?.role === "farmer" && order.status === "accepted" && hasCompletedPayment;
  const hasPendingPayment = (payments).some((p: any) => p.status === 'pending');
  const canConfirmReceipt = user?.role === "buyer" && order.status === "delivered" && hasCompletedPayment;

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
      <motion.div 
        className="min-h-screen bg-background print:bg-white"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
      <div className="container mx-auto px-4 py-8 max-w-4xl print:px-0 print:py-4">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation('/buyer/dashboard')}
          className="mb-6 print:hidden"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>        {/* Header */}
        <motion.div className="mb-6 print:mb-4" variants={fadeInUp}>
          <div className="flex items-start justify-between mb-2 print:flex-col print:gap-2">
            <div>
              <h1 className="text-3xl font-bold mb-1 print:text-2xl">Order Details</h1>
              <p className="text-muted-foreground print:text-sm print:text-gray-600">Order ID: {order.id}</p>
            </div>
            <Badge className={`${statusInfo.bgColor} ${statusInfo.textColor} border-0 print:self-start`}>
              {statusInfo.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </motion.div>

        {/* Status Timeline */}
        <Card className="mb-6 print:shadow-none print:border">
          <CardHeader className="print:pb-2">
            <CardTitle className="print:text-lg">Order Status</CardTitle>
          </CardHeader>
          <CardContent className="print:pt-2">
            <div className="flex items-center justify-between">
              {/* Pending */}
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  ['pending', 'accepted', 'delivered', 'completed'].includes(order.status)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <Clock className="h-5 w-5" />
                </div>
                <p className="text-xs mt-2 text-center">Pending</p>
              </div>
              
              <div className={`flex-1 h-1 ${
                ['accepted', 'delivered', 'completed'].includes(order.status)
                  ? 'bg-primary'
                  : 'bg-muted'
              }`}></div>

              {/* Accepted */}
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  ['accepted', 'delivered', 'completed'].includes(order.status)
                    ? 'bg-primary text-primary-foreground'
                    : order.status === 'rejected' || order.status === 'cancelled'
                    ? 'bg-red-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {order.status === 'rejected' || order.status === 'cancelled' ? (
                    <XCircle className="h-5 w-5" />
                  ) : (
                    <CheckCircle className="h-5 w-5" />
                  )}
                </div>
                <p className="text-xs mt-2 text-center">
                  {order.status === 'rejected' ? 'Rejected' : order.status === 'cancelled' ? 'Cancelled' : 'Accepted'}
                </p>
              </div>

              <div className={`flex-1 h-1 ${
                ['delivered', 'completed'].includes(order.status) ? 'bg-primary' : 'bg-muted'
              }`}></div>

              {/* Delivered */}
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  ['delivered', 'completed'].includes(order.status)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <Package className="h-5 w-5" />
                </div>
                <p className="text-xs mt-2 text-center">Delivered</p>
              </div>

              <div className={`flex-1 h-1 ${
                order.status === 'completed' ? 'bg-primary' : 'bg-muted'
              }`}></div>

              {/* Completed */}
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  order.status === 'completed'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <CheckCircle className="h-5 w-5" />
                </div>
                <p className="text-xs mt-2 text-center">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Escrow Status */}
        {escrow && (
          <div className="mb-6">
            <EscrowStatus
              escrow={escrow}
              onReportDispute={() => setIsDisputeDialogOpen(true)}
              showActions={escrow.status === "upfront_held" && user?.role === "buyer"}
            />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-6 print:gap-4 print:mb-4">
          {/* Product Details */}
          <Card className="print:shadow-none print:border">
            <CardHeader className="print:pb-2">
              <CardTitle className="print:text-lg">Product Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-muted rounded flex items-center justify-center flex-shrink-0">
                  {order.listing.imageUrl ? (
                    <img 
                      src={order.listing.imageUrl} 
                      alt={order.listing.productName}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <Package className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{order.listing.productName}</h3>
                  <Badge variant="outline" className="mb-2">{order.listing.category}</Badge>
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      Quantity: <span className="font-medium text-foreground">{order.quantity} {order.listing.unit}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Price per unit: <span className="font-medium text-foreground">{formatCurrency(order.listing.pricePerUnit)}</span>
                    </p>
                    <p className="font-semibold text-lg mt-2">
                      Total: {formatCurrency(order.totalPrice)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Farmer Details */}
          <Card className="print:shadow-none print:border">
            <CardHeader className="print:pb-2">
              <CardTitle className="print:text-lg">Farmer Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Name</p>
                  <p className="font-medium">{order.farmer.fullName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Region</p>
                  <p className="font-medium">{order.farmer.region}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Email</p>
                  <p className="font-medium">{order.farmer.email}</p>
                </div>
                {order.farmer.phoneNumber && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Phone</p>
                    <p className="font-medium">{order.farmer.phoneNumber}</p>
                  </div>
                )}
                <Button 
                  variant="outline" 
                  className="w-full mt-2"
                  onClick={() => setLocation(`/messages?user=${order.farmer.id}&name=${encodeURIComponent(order.farmer.fullName)}&role=farmer`)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Farmer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Delivery & Notes */}
        {(order.deliveryAddress || order.notes) && (
          <Card className="mb-6 print:shadow-none print:border print:mb-4">
            <CardHeader className="print:pb-2">
              <CardTitle className="print:text-lg">Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.deliveryAddress && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Delivery Address</p>
                  <p className="font-medium">{order.deliveryAddress}</p>
                </div>
              )}
              {order.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="font-medium">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Review Section - Only for completed orders */}
        {order.status === "completed" && (
          <Card className="mb-6 print:shadow-none print:border print:mb-4">
            <CardHeader className="print:pb-2">
              <CardTitle className="print:text-lg">
                {existingReview ? "Your Review" : "Rate This Order"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {existingReview ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-2xl">
                        {i < existingReview.rating ? "⭐" : "☆"}
                      </span>
                    ))}
                  </div>
                  {existingReview.comment && (
                    <p className="text-muted-foreground">{existingReview.comment}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Posted on {new Date(existingReview.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <ReviewForm 
                  orderId={order.id}
                  revieweeName={user?.role === "buyer" ? order.farmer.fullName : order.buyer.fullName}
                  revieweeRole={user?.role === "buyer" ? "farmer" : "buyer"}
                  onSuccess={() => {
                    queryClient.invalidateQueries({ 
                      queryKey: [`/api/reviews/order/${params?.id}`] 
                    });
                  }}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 print:hidden">
          <Button 
            onClick={handlePrintReceipt}
            variant="outline"
            size="lg"
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Receipt
          </Button>

          {canMarkDelivered && (
            <Button
              onClick={() => markAsDeliveredMutation.mutate()}
              size="lg"
              className="flex-1"
              disabled={markAsDeliveredMutation.isPending}
            >
              {markAsDeliveredMutation.isPending ? "Processing..." : "Mark as Delivered"}
            </Button>
          )}

          {canConfirmReceipt && (
            <Button
              onClick={() => confirmReceiptMutation.mutate()}
              size="lg"
              className="flex-1"
              disabled={confirmReceiptMutation.isPending}
            >
              {confirmReceiptMutation.isPending ? "Processing..." : "Confirm Receipt"}
            </Button>
          )}
          
          {canCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive"
                  size="lg"
                  className="flex-1"
                  disabled={cancelOrderMutation.isPending}
                >
                  {cancelOrderMutation.isPending ? "Cancelling..." : "Cancel Order"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will cancel your order. This action cannot be undone.
                    You can place a new order if you change your mind.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Order</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => cancelOrderMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Cancel Order
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {order.status === 'pending' && user?.role === 'buyer' && !hasCompletedPayment && !hasPendingPayment && (
            <Button
              onClick={() => initiatePaymentMutation.mutate()}
              size="lg"
              className="flex-1"
              disabled={initiatePaymentMutation.isPending}
            >
                {initiatePaymentMutation.isPending ? 'Initiating...' : 'Initiate Payment'}
            </Button>
          )}
          {hasPendingPayment && (
            <Button size="lg" className="flex-1" disabled>
              Payment Pending
            </Button>
          )}
        </div>

        {/* Print-only footer */}
        <div className="hidden print:block mt-8 pt-4 border-t text-center text-sm text-muted-foreground">
          <p>AgriCompass - Connecting Farmers and Buyers</p>
          <p className="mt-1">For support, contact us at support@agricompass.com</p>
        </div>
      </div>

      {/* Dispute Dialog */}
      <Dialog open={isDisputeDialogOpen} onOpenChange={setIsDisputeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Dispute</DialogTitle>
            <DialogDescription>
              Please describe the issue with this order. Our team will review your dispute and resolve it within 24-48 hours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dispute-reason">Dispute Reason</Label>
              <Textarea
                id="dispute-reason"
                placeholder="Describe the issue with your order..."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDisputeDialogOpen(false);
                setDisputeReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => reportDisputeMutation.mutate(disputeReason)}
              disabled={!disputeReason.trim() || reportDisputeMutation.isPending}
            >
              {reportDisputeMutation.isPending ? "Submitting..." : "Submit Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
