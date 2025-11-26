import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, CheckCircle, Clock, DollarSign } from "lucide-react";
import { Escrow } from "@shared/schema";
import { formatCurrency } from "@/lib/currency";

interface EscrowStatusProps {
  escrow: Escrow;
  onReportDispute?: () => void;
  showActions?: boolean;
}

export function EscrowStatus({ escrow, onReportDispute, showActions = true }: EscrowStatusProps) {
  const getEscrowStatusBadge = (status: string | null) => {
    const statusValue = status || "pending";
    const variants = {
      pending: { variant: "secondary" as const, icon: Clock, label: "Payment Pending" },
      upfront_held: { variant: "default" as const, icon: Shield, label: "Upfront Held" },
      remaining_released: { variant: "default" as const, icon: CheckCircle, label: "Remaining Released" },
      completed: { variant: "default" as const, icon: CheckCircle, label: "Completed" },
      disputed: { variant: "destructive" as const, icon: AlertTriangle, label: "Disputed" },
      refunded: { variant: "outline" as const, icon: DollarSign, label: "Refunded" },
    };
    const config = variants[statusValue as keyof typeof variants] || variants.pending;
    return (
      <Badge variant={config.variant} className="gap-1">
        <config.icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getEscrowDescription = (status: string | null) => {
    const statusValue = status || "pending";
    switch (statusValue) {
      case "pending":
        return "Waiting for upfront payment to be processed.";
      case "upfront_held":
        return "30% upfront payment is secured. Remaining 70% will be released upon successful delivery.";
      case "remaining_released":
        return "Full payment has been released to the farmer.";
      case "completed":
        return "Transaction completed successfully.";
      case "disputed":
        return "A dispute has been raised and is under review.";
      case "refunded":
        return "Payment has been refunded.";
      default:
        return "Unknown status.";
    }
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Escrow Protection</h3>
              {getEscrowStatusBadge(escrow.status)}
            </div>
            <p className="text-sm text-muted-foreground">
              {getEscrowDescription(escrow.status)}
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-medium ml-1">{formatCurrency(escrow.totalAmount)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Upfront (30%):</span>
                <span className="font-medium ml-1">{formatCurrency(escrow.upfrontAmount)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Remaining (70%):</span>
                <span className="font-medium ml-1">{formatCurrency(escrow.remainingAmount)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium ml-1 capitalize">{(escrow.status || "pending").replace("_", " ")}</span>
              </div>
            </div>
            {escrow.disputeReason && (
              <div className="mt-2 p-2 bg-destructive/10 rounded border border-destructive/20">
                <p className="text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Dispute: {escrow.disputeReason}
                </p>
              </div>
            )}
          </div>
          {showActions && escrow.status === "upfront_held" && onReportDispute && (
            <div className="flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={onReportDispute}
                className="text-destructive hover:text-destructive"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Report Dispute
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}