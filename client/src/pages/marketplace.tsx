import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Filter, 
  MapPin, 
  ShieldCheck,
  Package,
  X
} from "lucide-react";
import { ListingWithFarmer } from "@shared/schema";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const categories = [
  "All Categories",
  "Vegetables",
  "Fruits",
  "Grains",
  "Livestock",
  "Dairy",
  "Poultry",
  "Seeds",
  "Other"
];

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");

  const { data: listings, isLoading } = useQuery<ListingWithFarmer[]>({
    queryKey: ["/api/listings"],
  });

  const regions = listings 
    ? ["All Regions", ...Array.from(new Set(listings.map(l => l.location)))]
    : ["All Regions"];

  const filteredListings = listings?.filter(listing => {
    const matchesSearch = listing.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         listing.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All Categories" || listing.category === selectedCategory;
    const matchesRegion = selectedRegion === "All Regions" || listing.location === selectedRegion;
    const matchesVerified = !verifiedOnly || listing.farmer.verified;
    
    return matchesSearch && matchesCategory && matchesRegion && matchesVerified;
  })?.sort((a, b) => {
    if (sortBy === "price-low") return Number(a.price) - Number(b.price);
    if (sortBy === "price-high") return Number(b.price) - Number(a.price);
    return 0; // newest by default
  });

  const FilterContent = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-3">Category</h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              data-testid={`filter-category-${category.toLowerCase().replace(" ", "-")}`}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-semibold mb-3">Region</h3>
        <Select value={selectedRegion} onValueChange={setSelectedRegion}>
          <SelectTrigger data-testid="filter-region">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {regions.map((region) => (
              <SelectItem key={region} value={region}>
                {region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            className="rounded"
            data-testid="filter-verified"
          />
          <span className="text-sm font-medium">Verified Farmers Only</span>
        </label>
      </div>

      {(selectedCategory !== "All Categories" || selectedRegion !== "All Regions" || verifiedOnly) && (
        <>
          <Separator />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedCategory("All Categories");
              setSelectedRegion("All Regions");
              setVerifiedOnly(false);
            }}
            className="w-full"
            data-testid="button-clear-filters"
          >
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Marketplace</h1>
          <p className="text-muted-foreground">
            Browse quality agricultural products from verified farmers
          </p>
        </div>

        {/* Search and Sort Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="sm:hidden" data-testid="button-filters">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>
                  Refine your search results
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <FilterContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex gap-8">
          {/* Desktop Filters Sidebar */}
          <div className="hidden sm:block w-72 flex-shrink-0">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Filters</h2>
                <FilterContent />
              </CardContent>
            </Card>
          </div>

          {/* Product Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <Skeleton className="h-48 w-full rounded-t-lg" />
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredListings && filteredListings.length > 0 ? (
              <>
                <div className="mb-4 text-sm text-muted-foreground">
                  Showing {filteredListings.length} {filteredListings.length === 1 ? 'product' : 'products'}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredListings.map((listing) => (
                    <Link key={listing.id} href={`/marketplace/${listing.id}`}>
                      <Card className="hover-elevate h-full cursor-pointer overflow-hidden" data-testid={`card-listing-${listing.id}`}>
                        <div className="relative">
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
                          {listing.farmer.verified && (
                            <Badge 
                              variant="secondary" 
                              className="absolute top-2 right-2 gap-1"
                              data-testid={`badge-verified-${listing.id}`}
                            >
                              <ShieldCheck className="h-3 w-3" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-4 space-y-2">
                          <h3 className="font-semibold text-lg text-foreground line-clamp-1" data-testid={`text-product-name-${listing.id}`}>
                            {listing.productName}
                          </h3>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="line-clamp-1">{listing.location}</span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {listing.description}
                          </p>
                          <div className="flex items-baseline gap-2 pt-2">
                            <span className="text-2xl font-bold text-primary" data-testid={`text-price-${listing.id}`}>
                              ${listing.price}
                            </span>
                            <span className="text-sm text-muted-foreground">/ {listing.unit}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                            <span>Available: {listing.quantityAvailable} {listing.unit}</span>
                            <span>MOQ: {listing.minOrderQuantity}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <Card className="p-12">
                <div className="text-center space-y-4">
                  <Package className="h-16 w-16 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-semibold">No products found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your filters or search terms
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("All Categories");
                      setSelectedRegion("All Regions");
                      setVerifiedOnly(false);
                    }}
                    data-testid="button-reset-search"
                  >
                    Clear All Filters
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
