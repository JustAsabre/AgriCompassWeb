import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, 
  ShieldCheck, 
  Package, 
  Calendar,
  User,
  Phone,
  Mail,
  ShoppingCart,
  ChevronLeft,
  MessageCircle
} from "lucide-react";
import { ListingWithFarmer } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function ProductDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);

  const { data: listing, isLoading } = useQuery<ListingWithFarmer>({
    queryKey: ["/api/listings", id],
  });

  const addToCartMutation = useMutation({
    mutationFn: async (data: { listingId: string; quantity: number }) => {
      return apiRequest("POST", "/api/cart", data);
    },
    onSuccess: () => {
      toast({
        title: "Added to cart",
        description: "Product has been added to your cart",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add to cart. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddToCart = () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to add items to cart",
      });
      setLocation("/login");
      return;
    }

    if (user.role !== "buyer") {
      toast({
        title: "Buyer account required",
        description: "Only buyers can add items to cart",
        variant: "destructive",
      });
      return;
    }

    if (listing) {
      addToCartMutation.mutate({
        listingId: listing.id,
        quantity,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid lg:grid-cols-2 gap-8">
            <Skeleton className="h-96 w-full" />
            <div className="space-y-4">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-12">
          <div className="text-center space-y-4">
            <Package className="h-16 w-16 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold">Product not found</h3>
            <Button onClick={() => setLocation("/marketplace")}>
              Back to Marketplace
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/marketplace")}
          className="mb-6"
          data-testid="button-back"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Marketplace
        </Button>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Product Image */}
          <div>
            <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
              {listing.imageUrl ? (
                <img 
                  src={listing.imageUrl} 
                  alt={listing.productName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="h-32 w-32 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground" data-testid="text-product-name">
                  {listing.productName}
                </h1>
                {listing.farmer.verified && (
                  <Badge variant="secondary" className="gap-1" data-testid="badge-verified">
                    <ShieldCheck className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <Badge variant="outline">{listing.category}</Badge>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-primary" data-testid="text-price">
                ${listing.price}
              </span>
              <span className="text-lg text-muted-foreground">/ {listing.unit}</span>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-lg font-semibold" data-testid="text-quantity">
                  {listing.quantityAvailable} {listing.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Min Order</p>
                <p className="text-lg font-semibold">
                  {listing.minOrderQuantity} {listing.unit}
                </p>
              </div>
              {listing.harvestDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Harvest Date</p>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {listing.harvestDate}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {listing.location}
                </p>
              </div>
            </div>

            {listing.pricingTiers && listing.pricingTiers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Bulk Pricing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {listing.pricingTiers.map((tier, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-sm">
                          {tier.minQuantity}+ {listing.unit}
                        </span>
                        <span className="font-semibold">${tier.price}/{listing.unit}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator />

            {user?.role === "buyer" && (
              <div className="space-y-4">
                                <div>
                  <label className="text-sm font-medium mb-2 block">Quantity</label>
                  <Input
                    type="number"
                    min={listing.minOrderQuantity}
                    max={listing.quantityAvailable}
                    value={quantity || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setQuantity(value === '' ? 0 : Number(value));
                    }}
                    data-testid="input-quantity"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Min: {listing.minOrderQuantity}, Max: {listing.quantityAvailable}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    size="lg" 
                    className="w-full" 
                    onClick={handleAddToCart}
                    disabled={addToCartMutation.isPending || quantity < listing.minOrderQuantity}
                    data-testid="button-add-to-cart"
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Add to Cart
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full"
                    onClick={() => setLocation(`/messages?user=${listing.farmer.id}`)}
                    data-testid="button-contact-farmer"
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Contact Farmer
                  </Button>
                </div>
              </div>
            )}

            {!user && (
              <Button size="lg" className="w-full" onClick={() => setLocation("/login")} data-testid="button-login-to-order">
                Login to Order
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="description" className="mt-12">
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="seller">Seller Info</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-foreground whitespace-pre-line" data-testid="text-description">
                  {listing.description}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seller" className="mt-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-xl">
                      {listing.farmer.fullName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-semibold" data-testid="text-farmer-name">
                        {listing.farmer.fullName}
                      </h3>
                      {listing.farmer.verified && (
                        <Badge variant="secondary" className="gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          Verified Farmer
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {listing.farmer.region}
                    </p>
                    {listing.farmer.farmSize && (
                      <p className="text-sm text-muted-foreground">
                        Farm Size: {listing.farmer.farmSize}
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  {listing.farmer.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{listing.farmer.email}</span>
                    </div>
                  )}
                  {listing.farmer.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{listing.farmer.phone}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
