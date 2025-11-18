import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { Mail, Phone, MapPin, ShieldCheck, Building, Sprout } from "lucide-react";
import { RatingStars } from "@/components/rating-stars";

export default function Profile() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">Profile</h1>

        <div className="grid gap-6">
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-3xl">
                    {user.fullName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold" data-testid="text-name">
                        {user.fullName}
                      </h2>
                      {user.verified && (
                        <Badge variant="secondary" className="gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {user.role.replace("_", " ").toUpperCase()}
                    </Badge>
                    
                    {/* Show rating for farmers */}
                    {user.role === "farmer" && user.averageRating && user.reviewCount && user.reviewCount > 0 && (
                      <div className="mt-3">
                        <RatingStars 
                          rating={user.averageRating} 
                          reviewCount={user.reviewCount}
                          size="lg"
                        />
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span data-testid="text-email">{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span data-testid="text-region">{user.region}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {user.role === "buyer" && user.businessName && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Business Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{user.businessName}</p>
              </CardContent>
            </Card>
          )}

          {user.role === "farmer" && user.farmSize && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sprout className="h-5 w-5" />
                  Farm Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Farm Size</p>
                    <p className="text-lg font-semibold">{user.farmSize}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
