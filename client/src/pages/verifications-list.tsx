import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, User, MapPin, Calendar, FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Verification {
  id: string;
  farmerId: string;
  officerId: string;
  status: string;
  notes: string | null;
  documentUrl: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  farmer: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    region: string | null;
    farmSize: string | null;
  };
}

export default function VerificationsList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected" | null>(null);

  const { data: verifications, isLoading } = useQuery<Verification[]>({
    queryKey: ["/api/verifications"],
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const response = await fetch(`/api/verifications/${id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, notes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to review verification");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/verifications"] });
      toast({
        title: "Verification Reviewed",
        description: `Verification has been ${reviewAction}`,
      });
      setSelectedVerification(null);
      setReviewNotes("");
      setReviewAction(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Review Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReview = () => {
    if (!selectedVerification || !reviewAction) return;
    reviewMutation.mutate({
      id: selectedVerification.id,
      status: reviewAction,
      notes: reviewNotes,
    });
  };

  const pendingVerifications = verifications?.filter(v => v.status === "pending") || [];
  const approvedVerifications = verifications?.filter(v => v.status === "approved") || [];
  const rejectedVerifications = verifications?.filter(v => v.status === "rejected") || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const VerificationCard = ({ verification }: { verification: Verification }) => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{verification.farmer.fullName}</CardTitle>
              <CardDescription>{verification.farmer.email}</CardDescription>
            </div>
          </div>
          {getStatusBadge(verification.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {verification.farmer.phone && (
            <div>
              <Label className="text-muted-foreground">Phone</Label>
              <p>{verification.farmer.phone}</p>
            </div>
          )}
          {verification.farmer.region && (
            <div>
              <Label className="text-muted-foreground">Region</Label>
              <p className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {verification.farmer.region}
              </p>
            </div>
          )}
          {verification.farmer.farmSize && (
            <div>
              <Label className="text-muted-foreground">Farm Size</Label>
              <p>{verification.farmer.farmSize}</p>
            </div>
          )}
          <div>
            <Label className="text-muted-foreground">Submitted</Label>
            <p className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(verification.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>

        {verification.notes && (
          <div>
            <Label className="text-muted-foreground">Officer Notes</Label>
            <p className="text-sm mt-1">{verification.notes}</p>
          </div>
        )}

        {verification.documentUrl && (
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(verification.documentUrl!, '_blank')}
            >
              <FileText className="h-4 w-4 mr-2" />
              View Documents
            </Button>
          </div>
        )}

        {verification.status === "pending" && (
          <Button
            onClick={() => {
              setSelectedVerification(verification);
              setReviewNotes(verification.notes || "");
            }}
            className="w-full"
          >
            Review Verification
          </Button>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading verifications...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Farmer Verifications</h1>
          </div>
          <p className="text-muted-foreground">
            Review and approve farmer verification requests
          </p>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              Pending
              {pendingVerifications.length > 0 && (
                <Badge variant="secondary">{pendingVerifications.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingVerifications.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No pending verifications
                </CardContent>
              </Card>
            ) : (
              pendingVerifications.map(verification => (
                <VerificationCard key={verification.id} verification={verification} />
              ))
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedVerifications.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No approved verifications
                </CardContent>
              </Card>
            ) : (
              approvedVerifications.map(verification => (
                <VerificationCard key={verification.id} verification={verification} />
              ))
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedVerifications.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No rejected verifications
                </CardContent>
              </Card>
            ) : (
              rejectedVerifications.map(verification => (
                <VerificationCard key={verification.id} verification={verification} />
              ))
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={!!selectedVerification} onOpenChange={() => setSelectedVerification(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Verification Request</DialogTitle>
              <DialogDescription>
                Review the farmer's information and approve or reject their verification
              </DialogDescription>
            </DialogHeader>

            {selectedVerification && (
              <div className="space-y-4">
                <div>
                  <Label>Farmer</Label>
                  <p className="font-medium">{selectedVerification.farmer.fullName}</p>
                  <p className="text-sm text-muted-foreground">{selectedVerification.farmer.email}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="review-notes">Review Notes</Label>
                  <Textarea
                    id="review-notes"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add notes about your review decision..."
                    rows={4}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setSelectedVerification(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setReviewAction("rejected");
                  handleReview();
                }}
                disabled={reviewMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => {
                  setReviewAction("approved");
                  handleReview();
                }}
                disabled={reviewMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
