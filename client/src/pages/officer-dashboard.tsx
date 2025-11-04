import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle,
  XCircle,
  User,
  MapPin,
  Phone,
  Mail
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { User as UserType } from "@shared/schema";

export default function OfficerDashboard() {
  const { user } = useAuth();

  const { data: farmers, isLoading } = useQuery<UserType[]>({
    queryKey: ["/api/officer/farmers"],
  });

  const verifiedFarmers = farmers?.filter(f => f.verified) || [];
  const unverifiedFarmers = farmers?.filter(f => !f.verified) || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Field Officer Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user?.fullName}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Farmers</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="stat-total">
                    {isLoading ? "-" : farmers?.length || 0}
                  </p>
                </div>
                <User className="h-12 w-12 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Verification</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="stat-pending">
                    {isLoading ? "-" : unverifiedFarmers.length}
                  </p>
                </div>
                <Clock className="h-12 w-12 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Verified Farmers</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="stat-verified">
                    {isLoading ? "-" : verifiedFarmers.length}
                  </p>
                </div>
                <ShieldCheck className="h-12 w-12 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Farmers List */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Pending Verification</h2>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : unverifiedFarmers.length > 0 ? (
              <div className="space-y-4">
                {unverifiedFarmers.map((farmer) => (
                  <Card key={farmer.id} className="hover-elevate" data-testid={`card-farmer-${farmer.id}`}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarFallback className="text-xl">
                            {farmer.fullName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{farmer.fullName}</h3>
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="h-3 w-3" />
                              Pending
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              <span>{farmer.email}</span>
                            </div>
                            {farmer.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3" />
                                <span>{farmer.phone}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              <span>{farmer.region}</span>
                            </div>
                            {farmer.farmSize && (
                              <p>Farm Size: {farmer.farmSize}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="default" data-testid={`button-verify-${farmer.id}`}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Verify
                          </Button>
                          <Button size="sm" variant="destructive" data-testid={`button-reject-${farmer.id}`}>
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12">
                <div className="text-center space-y-4">
                  <CheckCircle className="h-16 w-16 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-semibold">All caught up!</h3>
                  <p className="text-muted-foreground">
                    No farmers pending verification
                  </p>
                </div>
              </Card>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Verified Farmers</h2>
            {verifiedFarmers.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {verifiedFarmers.map((farmer) => (
                  <Card key={farmer.id} className="hover-elevate">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback>{farmer.fullName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{farmer.fullName}</h3>
                            <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0" />
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{farmer.email}</p>
                          <p className="text-xs text-muted-foreground">{farmer.region}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12">
                <div className="text-center">
                  <ShieldCheck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No verified farmers yet</h3>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
