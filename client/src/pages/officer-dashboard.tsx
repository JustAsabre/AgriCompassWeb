import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
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
  Mail,
  FileText,
  TrendingUp,
  Star
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { User as UserType } from "@shared/schema";
import { Link, useLocation } from "wouter";
import {
  fadeInUp,
  staggerContainer,
  staggerItem
} from "@/lib/animations";

export default function OfficerDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: farmers, isLoading } = useQuery<UserType[]>({
    queryKey: ["/api/officer/farmers", user?.id],
    enabled: !!user?.id,
  });

  const verifiedFarmers = farmers?.filter(f => f.verified) || [];
  const unverifiedFarmers = farmers?.filter(f => !f.verified) || [];

  // Fetch actual verification requests submitted by farmers
  const { data: verifications } = useQuery<any[]>({
    queryKey: ['/api/verifications'],
    enabled: !!user?.id && user?.role === 'field_officer',
  });

  return (
    <motion.div 
      className="min-h-screen bg-gradient-subtle"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
        {/* Header */}
        <motion.div className="mb-8 flex items-center justify-between" variants={fadeInUp}>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Field Officer Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {user?.fullName}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/officer/analytics">
              <Button variant="outline" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                View Analytics
              </Button>
            </Link>
            <Link href="/officer/reviews">
              <Button variant="outline" className="gap-2">
                <Star className="h-4 w-4" />
                Review Moderation
              </Button>
            </Link>
            <Link href="/officer/verifications">
              <Button className="gap-2">
                <FileText className="h-4 w-4" />
                View All Verifications
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div className="grid md:grid-cols-3 gap-6 mb-8" variants={staggerContainer}>
          <motion.div variants={staggerItem}>
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
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending Verification</p>
                    <p className="text-3xl font-bold text-foreground mt-2" data-testid="stat-pending">
                      {isLoading ? "-" : (verifications?.filter(v => v.status === 'pending').length ?? 0)}
                    </p>
                  </div>
                  <Clock className="h-12 w-12 text-primary" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
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
          </motion.div>
        </motion.div>

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
            ) : verifications && verifications.length > 0 ? (
              <div className="space-y-4">
                {verifications.map((v) => (
                  <Card key={v.id} className="hover-elevate" data-testid={`card-verification-${v.id}`}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarFallback className="text-xl">
                            {v.farmer?.fullName?.charAt(0) ?? 'f'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{v.farmer?.fullName}</h3>
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="h-3 w-3" />
                              Pending
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              <span>{v.farmer?.email}</span>
                            </div>
                            {v.farmer?.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3" />
                                <span>{v.farmer?.phone}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              <span>{v.farmer?.region}</span>
                            </div>
                            {v.farmer?.farmSize && (
                              <p>Farm Size: {v.farmer?.farmSize}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={async () => {
                              try {
                                await apiRequest('PATCH', `/api/verifications/${v.id}/review`, { status: 'approved' });
                                queryClient.invalidateQueries({ queryKey: ['/api/verifications'] });
                                queryClient.invalidateQueries({ queryKey: ['/api/officer/farmers'] });
                              } catch (error) {
                                console.error('Error approving verification:', error);
                                alert('Error approving verification');
                              }
                            }}
                            data-testid={`button-approve-${v.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={async () => {
                              try {
                                await apiRequest('PATCH', `/api/verifications/${v.id}/review`, { status: 'rejected' });
                                queryClient.invalidateQueries({ queryKey: ['/api/verifications'] });
                                queryClient.invalidateQueries({ queryKey: ['/api/officer/farmers'] });
                              } catch (error) {
                                console.error('Error rejecting verification:', error);
                                alert('Error rejecting verification');
                              }
                            }}
                            data-testid={`button-reject-${v.id}`}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
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
    </motion.div>
  );
}
