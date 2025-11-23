import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Download, MessageCircle, ArrowRight, Package } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface OrderWithDetails {
  id: string;
  buyerId: string;
  farmerId: string;
  listingId: string;
  quantity: number;
  totalPrice: string;
  status: string;
  deliveryAddress?: string;
  notes?: string;
  createdAt: string;
  listing: {
    productName: string;
    category: string;
    unit: string;
    imageUrl?: string;
  };
  farmer: {
    id: string;
    fullName: string;
    email: string;
    region: string;
  };
}

export default function OrderSuccess() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get order IDs from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ids = params.get('orders');
    if (ids) {
      setOrderIds(ids.split(','));
      return;
    }
    // If no orders in params, but a paystack reference is present, try to fetch the related orders
    const reference = params.get('reference') || params.get('paystack_ref');
    if (!reference) {
      // No orders or reference; redirect back
      setLocation('/buyer/dashboard');
      return;
    }

    (async () => {
      try {
        // Optionally attempt client verify first
        await fetch('/api/payments/paystack/verify-client', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference }) });
      } catch (err) {
        // ignore
      }

      try {
        const res = await fetch(`/api/payments/transaction/${encodeURIComponent(reference)}`, { credentials: 'include' });
        if (!res.ok) {
          setLocation('/buyer/dashboard');
          return;
        }
        const body = await res.json();
        const payments: any[] = body.payments || [];
        if (payments.length === 0) {
          setLocation('/buyer/dashboard');
          return;
        }
        const idsFromPayments = Array.from(new Set(payments.map(p => p.orderId)));
        setOrderIds(idsFromPayments);
      } catch (err) {
        setLocation('/buyer/dashboard');
      }
    })();
  }, [setLocation]);

  // Auto verify after Paystack redirect if reference query param is present
  useEffect(() => {
    const url = new URL(window.location.href);
    const reference = url.searchParams.get('reference') || url.searchParams.get('paystack_ref');
    if (!reference) return;
    (async () => {
      try {
        await fetch('/api/payments/paystack/verify-client', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference }) });
        // refresh queries
        await queryClient.invalidateQueries({ queryKey: ['/api/buyer/orders', user?.id] });
        await queryClient.invalidateQueries({ queryKey: ['/api/payments/order'] });
        toast({ title: 'Payment verified', description: 'Your payment has been verified.' });
        // Clean up parameters
        url.searchParams.delete('reference');
        url.searchParams.delete('paystack_ref');
        window.history.replaceState({}, '', url.toString());
      } catch (err) { /* ignore */ }
    })();
  }, [queryClient, user, toast]);

  // Fetch order details
  const { data: orders, isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ['/api/buyer/orders', user?.id],
    enabled: orderIds.length > 0 && !!user?.id,
  });

  // Filter to only show the orders that were just created
  const recentOrders = orders?.filter(order => orderIds.includes(order.id));

  const totalAmount = recentOrders?.reduce((sum, order) => {
    const price = parseFloat(order.totalPrice);
    return sum + (isNaN(price) ? 0 : price);
  }, 0) || 0;

  const handlePrintReceipt = () => {
    window.print();
  };

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

  if (!recentOrders || recentOrders.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No Orders Found</h2>
            <p className="text-muted-foreground mb-4">
              We couldn't find the orders you're looking for.
            </p>
            <Button onClick={() => setLocation('/marketplace')}>
              Browse Marketplace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Success Header */}
        <div className="text-center mb-8 print:mb-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/10 rounded-full mb-4 print:hidden">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent print:text-black">
            Order Confirmed!
          </h1>
          <p className="text-muted-foreground text-lg">
            Thank you for your order. We've notified the farmers.
          </p>
        </div>

        {/* Order Summary Card */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center justify-between">
              <CardTitle>Order Summary</CardTitle>
              <Badge variant="secondary" className="text-sm">
                {recentOrders.length} {recentOrders.length === 1 ? 'Order' : 'Orders'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {recentOrders.map((order, index) => (
                <div key={order.id}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-muted rounded flex items-center justify-center flex-shrink-0">
                      {order.listing.imageUrl ? (
                        <img 
                          src={order.listing.imageUrl} 
                          alt={order.listing.productName}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <Package className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <h3 className="font-semibold">{order.listing.productName}</h3>
                          <p className="text-sm text-muted-foreground">
                            From {order.farmer.fullName} • {order.farmer.region}
                          </p>
                        </div>
                        <Badge className="ml-2">{order.status}</Badge>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-sm">
                          Quantity: <span className="font-medium">{order.quantity} {order.listing.unit}</span>
                        </p>
                        <p className="font-semibold">{formatCurrency(order.totalPrice)}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Order ID: {order.id}
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => setLocation(`/messages?user=${order.farmer.id}&name=${encodeURIComponent(order.farmer.fullName)}&role=farmer`)}
                      >
                        <MessageCircle className="h-3 w-3 mr-2" />
                        Contact {order.farmer.fullName.split(' ')[0]}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-6" />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span className="text-green-600">Free</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mb-6 print:hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              What Happens Next?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              <li className="flex gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Farmer Reviews Your Order</h4>
                  <p className="text-sm text-muted-foreground">
                    The farmer will review your order and confirm availability.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Order Confirmation</h4>
                  <p className="text-sm text-muted-foreground">
                    You'll receive a notification once the farmer accepts your order.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Coordinate Delivery</h4>
                  <p className="text-sm text-muted-foreground">
                    Contact the farmer to arrange pickup or delivery details.
                  </p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

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
          <Button 
            onClick={() => setLocation('/buyer/dashboard')}
            size="lg"
            className="flex-1"
          >
            View All Orders
          </Button>
        </div>

        {/* Print-only footer */}
        <div className="hidden print:block mt-8 pt-4 border-t text-center text-sm text-muted-foreground">
          <p>AgriCompass - Connecting Farmers and Buyers</p>
          <p className="mt-1">For support, contact us at support@agricompass.com</p>
        </div>
      </div>
    </div>
  );
}
