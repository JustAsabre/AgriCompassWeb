import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  TrendingDown,
  ChevronLeft,
  Package
} from "lucide-react";
import { CartItemWithListing, PricingTier } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from '@/lib/currency';
import { useState, useEffect } from "react";
import {
  fadeInUp,
  staggerContainer,
  staggerItem,
  scaleIn
} from "@/lib/animations";

export default function Cart() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [autoPay, setAutoPay] = useState(true);
  const [pricingTiersMap, setPricingTiersMap] = useState<Record<string, PricingTier[]>>({});

  const { data: cartItems, isLoading } = useQuery<CartItemWithListing[]>({
    queryKey: ["/api/cart", user?.id],
    enabled: !!user?.id,
  });

  // Fetch pricing tiers for all cart items
  useEffect(() => {
    if (!cartItems || cartItems.length === 0) return;

    const fetchPricingTiers = async () => {
      const tiersMap: Record<string, PricingTier[]> = {};

      await Promise.all(
        cartItems.map(async (item) => {
          try {
            try {
              const tiers = await apiRequest('GET', `/api/listings/${item.listing.id}/pricing-tiers`);
              tiersMap[item.listing.id] = tiers || [];
            } catch (error) {
              tiersMap[item.listing.id] = [];
            }
          } catch (error) {
            console.error(`Error fetching tiers for listing ${item.listing.id}:`, error);
            tiersMap[item.listing.id] = [];
          }
        })
      );

      setPricingTiersMap(tiersMap);
    };

    fetchPricingTiers();
  }, [cartItems]);

  // Calculate price with tiered pricing
  const calculatePrice = (listingId: string, basePrice: string, quantity: number) => {
    const tiers = pricingTiersMap[listingId] || [];
    if (tiers.length === 0) {
      return Number(basePrice) * quantity;
    }

    // Find applicable tier (highest minQuantity that's <= quantity)
    const applicableTier = tiers
      .filter(tier => quantity >= tier.minQuantity)
      .sort((a, b) => b.minQuantity - a.minQuantity)[0];

    const pricePerUnit = applicableTier ? Number(applicableTier.price) : Number(basePrice);
    return pricePerUnit * quantity;
  };

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiRequest("DELETE", `/api/cart/${itemId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries(); // Global invalidation for instant updates
      toast({
        title: "Item removed",
        description: "Item has been removed from your cart",
      });
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      return apiRequest("PATCH", `/api/cart/${id}`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(); // Global invalidation for instant updates
      toast({
        title: "Quantity updated",
        description: "Cart has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/orders/checkout", data);
      return response;
    },
    onSuccess: async (data: any) => {

      // Global invalidation for instant real-time updates across all pages
      await queryClient.invalidateQueries();

      // Redirect to order success page with order IDs
      if (data && data.orders && data.orders.length > 0) {
        const orderIds = data.orders.map((order: any) => order.id).join(',');
        // If autoPay was requested and we received an authorization URL, redirect to Paystack
        if (data.autoPay && data.autoPay.authorization_url) {
          // If some farmers lack recipients, show a warning to the buyer before redirect
          if (data.autoPay.missingRecipients && data.autoPay.missingRecipients.length > 0) {
            toast({ title: 'Note', description: 'Some farmers do not have payout recipients configured. Payouts may be delayed; farmers will be notified to set up payout details.' });
          }
          // If we need to preserve return state, let Paystack redirect back to the site
          window.location.href = data.autoPay.authorization_url;
          return;
        }
        setLocation(`/order-success?orders=${orderIds}`);
      } else {
        toast({
          title: "Order placed!",
          description: "Your orders have been submitted successfully.",
        });
        setLocation("/buyer/dashboard");
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const groupedByFarmer = cartItems?.reduce((acc, item) => {
    const farmerId = item.listing.farmerId;
    if (!acc[farmerId]) {
      acc[farmerId] = {
        farmer: item.listing.farmer,
        items: [],
        total: 0,
      };
    }
    acc[farmerId].items.push(item);
    const itemTotal = calculatePrice(item.listing.id, item.listing.price, item.quantity);
    acc[farmerId].total += itemTotal;
    return acc;
  }, {} as Record<string, { farmer: any; items: CartItemWithListing[]; total: number }>);

  const grandTotal = Object.values(groupedByFarmer || {}).reduce((sum, group) => sum + group.total, 0);

  const handleCheckout = () => {
    if (!deliveryAddress) {
      toast({
        title: "Delivery address required",
        description: "Please enter a delivery address",
        variant: "destructive",
      });
      return;
    }

    const returnUrl = `${window.location.origin}/order-success`;
    // If autoPay is requested, ensure buyer has email registered etc. (server validates amount)
    checkoutMutation.mutate({
      deliveryAddress,
      notes,
      autoPay,
      returnUrl,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="min-h-screen bg-gradient-subtle"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => setLocation("/marketplace")}
          className="mb-6"
          data-testid="button-back"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Continue Shopping
        </Button>

        <motion.div className="flex items-center gap-3 mb-8" variants={fadeInUp}>
          <ShoppingCart className="h-8 w-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Shopping Cart</h1>
        </motion.div>

        {cartItems && cartItems.length > 0 ? (
          <motion.div className="grid lg:grid-cols-3 gap-8" variants={staggerContainer}>
            <div className="lg:col-span-2 space-y-6">
              {Object.entries(groupedByFarmer || {}).map(([farmerId, group]) => (
                <motion.div key={farmerId} variants={staggerItem}>
                  <Card>
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <h3 className="font-semibold text-lg">From {group.farmer.fullName}</h3>
                        <p className="text-sm text-muted-foreground">{group.farmer.region}</p>
                      </div>
                    <Separator className="mb-4" />
                    <div className="space-y-4">
                      {group.items.map((item) => {
                        const tiers = pricingTiersMap[item.listing.id] || [];
                        const applicableTier = tiers
                          .filter(tier => item.quantity >= tier.minQuantity)
                          .sort((a, b) => b.minQuantity - a.minQuantity)[0];
                        const basePrice = Number(item.listing.price);
                        const tieredPrice = applicableTier ? Number(applicableTier.price) : basePrice;
                        const itemTotal = calculatePrice(item.listing.id, item.listing.price, item.quantity);
                        const savings = applicableTier ? (basePrice - tieredPrice) * item.quantity : 0;

                        return (
                          <div key={item.id} className="flex gap-4" data-testid={`cart-item-${item.id}`}>
                            <div className="w-20 h-20 bg-muted rounded flex items-center justify-center flex-shrink-0">
                              {item.listing.imageUrl ? (
                                <img
                                  src={item.listing.imageUrl}
                                  alt={item.listing.productName}
                                  className="w-full h-full object-cover rounded"
                                />
                              ) : (
                                <Package className="h-8 w-8 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold truncate">{item.listing.productName}</h4>
                              <p className="text-sm text-muted-foreground">
                                {formatCurrency(item.listing.price)} / {item.listing.unit}
                                {applicableTier && (
                                  <span className="ml-2 text-primary font-medium">
                                    → {formatCurrency(tieredPrice)} / {item.listing.unit}
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-muted-foreground">Quantity:</span>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => {
                                      if (item.quantity > 1) {
                                        updateQuantityMutation.mutate({
                                          id: item.id,
                                          quantity: item.quantity - 1
                                        });
                                      }
                                    }}
                                    disabled={updateQuantityMutation.isPending || item.quantity <= 1}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <Input
                                    type="number"
                                    min="1"
                                    max={item.listing.quantityAvailable}
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const newQty = parseInt(e.target.value);
                                      if (newQty > 0 && newQty <= item.listing.quantityAvailable) {
                                        updateQuantityMutation.mutate({
                                          id: item.id,
                                          quantity: newQty
                                        });
                                      }
                                    }}
                                    className="w-16 h-7 text-center"
                                    disabled={updateQuantityMutation.isPending}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => {
                                      if (item.quantity < item.listing.quantityAvailable) {
                                        updateQuantityMutation.mutate({
                                          id: item.id,
                                          quantity: item.quantity + 1
                                        });
                                      }
                                    }}
                                    disabled={updateQuantityMutation.isPending || item.quantity >= item.listing.quantityAvailable}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                                <span className="text-xs text-muted-foreground">{item.listing.unit}</span>
                              </div>
                              {savings > 0 && (
                                <Badge variant="secondary" className="mt-1 gap-1">
                                  <TrendingDown className="h-3 w-3" />
                                  Save {formatCurrency(savings)}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="text-right">
                                {savings > 0 && (
                                  <p className="text-xs text-muted-foreground line-through">
                                    {formatCurrency(basePrice * item.quantity)}
                                  </p>
                                )}
                                <p className="font-semibold text-primary">
                                  {formatCurrency(itemTotal)}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItemMutation.mutate(item.id)}
                                disabled={removeItemMutation.isPending}
                                data-testid={`button-remove-${item.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Separator className="my-4" />
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Subtotal</span>
                      <span className="font-bold text-lg text-primary">
                        {formatCurrency(group.total)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              ))}
            </div>

            <motion.div className="lg:col-span-1" variants={scaleIn}>
              <Card className="sticky top-20">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold text-lg">Order Summary</h3>
                  <Separator />

                  <div>
                    <label className="text-sm font-medium mb-2 block">Delivery Address</label>
                    <Textarea
                      placeholder="Enter your delivery address"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      data-testid="input-delivery-address"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
                    <Textarea
                      placeholder="Any special instructions?"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      data-testid="input-notes"
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Items</span>
                      <span>{cartItems.length}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-primary" data-testid="text-total">
                        {formatCurrency(grandTotal)}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={checkoutMutation.isPending}
                    data-testid="button-checkout"
                  >
                    {checkoutMutation.isPending ? "Processing..." : "Place Order"}
                  </Button>
                  <div className="mt-2 flex items-center gap-2">
                    <input type="checkbox" id="autoPay" checked={autoPay} onChange={(e) => setAutoPay(e.target.checked)} />
                    <label htmlFor="autoPay" className="text-sm text-muted-foreground">Pay now (one-click)</label>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div variants={fadeInUp}>
            <Card className="p-12">
              <div className="text-center space-y-4">
                <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-semibold">Your cart is empty</h3>
                <p className="text-muted-foreground">
                  Start adding products to your cart from the marketplace
                </p>
                <Button onClick={() => setLocation("/marketplace")} data-testid="button-browse">
                  Browse Products
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
