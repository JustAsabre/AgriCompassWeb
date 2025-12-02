import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Trash2, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { RatingStars } from "@/components/rating-stars";
import { ReviewWithUsers } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export default function AdminReviews() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: reviews, isLoading } = useQuery<ReviewWithUsers[]>({
    queryKey: ["/api/reviews", user?.id],
    enabled: !!user?.id,
  });

  const approveReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      return apiRequest("PATCH", `/api/reviews/${reviewId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries(); // Global invalidation for instant updates
      toast({
        title: "Review Approved",
        description: "The review has been approved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve review",
        variant: "destructive",
      });
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      return apiRequest("DELETE", `/api/reviews/${reviewId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries(); // Global invalidation for instant updates
      toast({
        title: "Review Deleted",
        description: "The review has been deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete review",
        variant: "destructive",
      });
    },
  });

  const filteredReviews = reviews?.filter((review) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "pending") return !review.approved;
    if (statusFilter === "approved") return review.approved;
    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">Review Moderation</h1>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Review Moderation</h1>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reviews</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredReviews && filteredReviews.length > 0 ? (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Review Content */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start gap-4">
                        <Avatar>
                          <AvatarFallback>
                            {review.reviewer.fullName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold">{review.reviewer.fullName}</p>
                              <p className="text-sm text-muted-foreground">
                                reviewed {review.reviewee.fullName}
                              </p>
                            </div>
                            <Badge variant={review.approved ? "default" : "secondary"}>
                              {review.approved ? "Approved" : "Pending"}
                            </Badge>
                          </div>
                          
                          <RatingStars 
                            rating={review.rating} 
                            showCount={false}
                            size="sm"
                          />
                          
                          <p className="text-sm text-muted-foreground mt-2">
                            {review.createdAt && formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <p className="text-foreground">{review.comment}</p>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <p>Order ID: {review.orderId.slice(0, 8)}...</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex lg:flex-col gap-2 lg:w-auto">
                      {!review.approved && (
                        <Button
                          onClick={() => approveReviewMutation.mutate(review.id)}
                          disabled={approveReviewMutation.isPending}
                          className="flex-1 lg:w-full gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </Button>
                      )}
                      
                      {review.approved && (
                        <Button
                          variant="outline"
                          disabled
                          className="flex-1 lg:w-full gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approved
                        </Button>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            className="flex-1 lg:w-full gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Review</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this review? This action cannot be undone.
                              The review will be permanently removed from the system.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteReviewMutation.mutate(review.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
              <h3 className="text-lg font-semibold">No Reviews Found</h3>
              <p className="text-muted-foreground">
                {statusFilter === "pending" 
                  ? "There are no pending reviews to moderate"
                  : statusFilter === "approved"
                  ? "There are no approved reviews yet"
                  : "No reviews have been submitted yet"}
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
