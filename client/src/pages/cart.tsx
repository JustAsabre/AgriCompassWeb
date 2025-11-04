import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  ShoppingCart, 
  Trash2, 
  ChevronLeft,
  Package
} from "lucide-react";
import { CartItemWithListing } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";

export default function Cart() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");

  const { data: cartItems, isLoading } = useQuery<CartItemWithListing[]>({
    queryKey: ["/api/cart"],
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiRequest("DELETE", `/api/cart/${itemId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Item removed",
        description: "Item has been removed from your cart",
      });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/orders/checkout", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/buyer/orders"] });
      toast({
        title: "Order placed!",
        description: "Your orders have been submitted successfully.",
      });
      setLocation("/buyer/dashboard");
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
    acc[farmerId].total += Number(item.listing.price) * item.quantity;
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

    checkoutMutation.mutate({
      deliveryAddress,
      notes,
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
    <div className="min-h-screen bg-background">
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

        <div className="flex items-center gap-3 mb-8">
          <ShoppingCart className="h-8 w-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Shopping Cart</h1>
        </div>

        {cartItems && cartItems.length > 0 ? (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {Object.entries(groupedByFarmer || {}).map(([farmerId, group]) => (
                <Card key={farmerId}>
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <h3 className="font-semibold text-lg">From {group.farmer.fullName}</h3>
                      <p className="text-sm text-muted-foreground">{group.farmer.region}</p>
                    </div>
                    <Separator className="mb-4" />
                    <div className="space-y-4">
                      {group.items.map((item) => (
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
                              ${item.listing.price} / {item.listing.unit}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Quantity: {item.quantity} {item.listing.unit}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <p className="font-semibold text-primary">
                              ${(Number(item.listing.price) * item.quantity).toFixed(2)}
                            </p>
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
                      ))}
                    </div>
                    <Separator className="my-4" />
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Subtotal</span>
                      <span className="font-bold text-lg text-primary">
                        ${group.total.toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="lg:col-span-1">
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
                        ${grandTotal.toFixed(2)}
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
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
