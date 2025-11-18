import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PricingTier } from "@shared/schema";

const pricingTierSchema = z.object({
  minQuantity: z.coerce.number().min(1, "Minimum quantity must be at least 1"),
  price: z.string().min(1, "Price is required"),
});

type PricingTierFormData = z.infer<typeof pricingTierSchema>;

interface PricingTierFormProps {
  listingId: string;
  basePrice: number;
}

export function PricingTierForm({ listingId, basePrice }: PricingTierFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);

  // Fetch existing tiers
  const { data: tiers = [] } = useQuery<PricingTier[]>({
    queryKey: [`/api/listings/${listingId}/pricing-tiers`],
    enabled: !!listingId,
  });

  const form = useForm<PricingTierFormData>({
    resolver: zodResolver(pricingTierSchema),
    defaultValues: {
      minQuantity: 0,
      price: "",
    },
  });

  // Add tier mutation
  const addTierMutation = useMutation({
    mutationKey: [`pricing-tiers-add-${listingId}`],
    mutationFn: async (data: PricingTierFormData) => {
      return apiRequest("POST", `/api/listings/${listingId}/pricing-tiers`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/listings/${listingId}/pricing-tiers`] });
      form.reset();
      setIsAdding(false);
      toast({
        title: "Tier Added",
        description: "Pricing tier added successfully",
      });
    },
    onError: (error: any) => {
      console.error('Error adding tier:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add pricing tier",
        variant: "destructive",
      });
    },
  });

  // Delete tier mutation
  const deleteTierMutation = useMutation({
    mutationKey: [`pricing-tiers-delete-${listingId}`],
    mutationFn: async (tierId: string) => {
      return apiRequest("DELETE", `/api/pricing-tiers/${tierId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/listings/${listingId}/pricing-tiers`] });
      toast({
        title: "Tier Deleted",
        description: "Pricing tier removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete pricing tier",
        variant: "destructive",
      });
    },
  });

  const handleAddTier = (data: PricingTierFormData) => {
    // Check for duplicate min quantity
    if (tiers.some(t => t.minQuantity === data.minQuantity)) {
      toast({
        title: "Duplicate Tier",
        description: "A tier with this minimum quantity already exists",
        variant: "destructive",
      });
      return;
    }

    // Validate price is less than base price
    if (parseFloat(data.price) >= basePrice) {
      toast({
        title: "Invalid Price",
        description: "Tier price must be less than the base price",
        variant: "destructive",
      });
      return;
    }

    console.log('Validation passed, calling mutation');
    
    // Add a timeout to prevent hanging requests
    const timeoutId = setTimeout(() => {
      console.warn('Tier mutation taking too long, may have timed out');
    }, 5000);
    
    addTierMutation.mutate(data, {
      onSettled: () => {
        clearTimeout(timeoutId);
      }
    });
  };

  const sortedTiers = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {/* Display existing tiers */}
        {sortedTiers.length > 0 && (
          <div className="space-y-2">
            <Label>Current Pricing Tiers</Label>
            <div className="space-y-2">
              {sortedTiers.map((tier, index) => (
                <div
                  key={tier.id || index}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {tier.minQuantity}+ units → ${tier.price} per unit
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteTierMutation.mutate(tier.id)}
                    disabled={deleteTierMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add new tier form */}
        {!isAdding && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsAdding(true)}
            disabled={addTierMutation.isPending || tiers.length >= 5}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Pricing Tier {tiers.length >= 5 && "(Maximum 5 tiers)"}
          </Button>
        )}

        {isAdding && (
          <form onSubmit={form.handleSubmit(handleAddTier)} className="space-y-4 border p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minQuantity">Minimum Quantity</Label>
                <Input
                  id="minQuantity"
                  type="number"
                  min="1"
                  placeholder="e.g., 100"
                  {...form.register("minQuantity")}
                  disabled={addTierMutation.isPending}
                />
                {form.formState.errors.minQuantity && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.minQuantity.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price per Unit ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g., 2.50"
                  {...form.register("price")}
                  disabled={addTierMutation.isPending}
                />
                {form.formState.errors.price && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.price.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={addTierMutation.isPending}>
                {addTierMutation.isPending ? "Adding..." : "Add Tier"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  form.reset();
                }}
                disabled={addTierMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {sortedTiers.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No pricing tiers added. Add tiers to offer bulk discounts.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
