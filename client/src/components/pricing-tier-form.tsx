import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Edit2, Check, X, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/currency";
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
  const [editingId, setEditingId] = useState<string | null>(null);

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
      queryClient.invalidateQueries(); // Global invalidation for instant updates
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
      queryClient.invalidateQueries(); // Global invalidation for instant updates
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

  // Update tier mutation
  const updateTierMutation = useMutation({
    mutationKey: [`pricing-tiers-update-${listingId}`],
    mutationFn: async ({ id, data }: { id: string; data: PricingTierFormData }) => {
      return apiRequest("PATCH", `/api/pricing-tiers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(); // Global invalidation for instant updates
      setEditingId(null);
      toast({
        title: "Tier Updated",
        description: "Pricing tier updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update pricing tier",
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

  // Edit tier inline form component
  const EditTierForm = ({ 
    tier, 
    basePrice, 
    onSave, 
    onCancel, 
    isPending 
  }: { 
    tier: PricingTier; 
    basePrice: number; 
    onSave: (data: PricingTierFormData) => void; 
    onCancel: () => void; 
    isPending: boolean; 
  }) => {
    const editForm = useForm<PricingTierFormData>({
      resolver: zodResolver(pricingTierSchema),
      defaultValues: {
        minQuantity: tier.minQuantity,
        price: String(tier.price),
      },
    });

    const handleSubmit = (data: PricingTierFormData) => {
      // Validate price is less than base price
      if (parseFloat(data.price) >= basePrice) {
        toast({
          title: "Invalid Price",
          description: "Tier price must be less than the base price",
          variant: "destructive",
        });
        return;
      }

      onSave(data);
    };

    return (
      <form onSubmit={editForm.handleSubmit(handleSubmit)} className="p-4 bg-white/50">
        <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">
          Editing Tier
        </div>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="space-y-2">
            <Label htmlFor={`edit-minQuantity-${tier.id}`} className="text-sm">Minimum Quantity</Label>
            <Input
              id={`edit-minQuantity-${tier.id}`}
              type="number"
              min="1"
              {...editForm.register("minQuantity")}
              disabled={isPending}
              className="bg-white"
            />
            {editForm.formState.errors.minQuantity && (
              <p className="text-xs text-destructive">
                {editForm.formState.errors.minQuantity.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-price-${tier.id}`} className="text-sm">Price per Unit ($)</Label>
            <Input
              id={`edit-price-${tier.id}`}
              type="number"
              step="0.01"
              min="0.01"
              {...editForm.register("price")}
              disabled={isPending}
              className="bg-white"
            />
            {editForm.formState.errors.price && (
              <p className="text-xs text-destructive">
                {editForm.formState.errors.price.message}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending} size="sm">
            <Check className="mr-1 h-4 w-4" />
            {isPending ? "Saving..." : "Save"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            size="sm"
          >
            <X className="mr-1 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </form>
    );
  };

  const sortedTiers = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);

  const calculateSavings = (tierPrice: number) => {
    const savings = ((basePrice - tierPrice) / basePrice) * 100;
    return Math.round(savings);
  };

  const getTierColor = (index: number) => {
    const colors = [
      "bg-green-50 border-green-200",
      "bg-emerald-50 border-emerald-200", 
      "bg-teal-50 border-teal-200",
      "bg-cyan-50 border-cyan-200",
      "bg-sky-50 border-sky-200"
    ];
    return colors[index] || colors[0];
  };

  const getSavingsBadgeColor = (savings: number) => {
    if (savings >= 25) return "bg-green-600 text-white";
    if (savings >= 15) return "bg-green-500 text-white";
    if (savings >= 10) return "bg-yellow-500 text-white";
    return "bg-blue-500 text-white";
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {/* Display existing tiers */}
        {sortedTiers.length > 0 && (
          <div className="space-y-3">
            <Label className="text-base font-semibold">Bulk Pricing Tiers</Label>
            <div className="space-y-3">
              {sortedTiers.map((tier, index) => {
                const savings = calculateSavings(Number(tier.price));
                const isEditing = editingId === tier.id;
                
                return (
                  <div
                    key={tier.id || index}
                    className={`border-2 rounded-lg transition-all ${getTierColor(index)} ${
                      isEditing ? "ring-2 ring-primary" : ""
                    }`}
                  >
                    {isEditing ? (
                      <EditTierForm
                        tier={tier}
                        basePrice={basePrice}
                        onSave={(data) => {
                          updateTierMutation.mutate({ id: tier.id, data });
                        }}
                        onCancel={() => setEditingId(null)}
                        isPending={updateTierMutation.isPending}
                      />
                    ) : (
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              🎯 Bulk Tier {index + 1}
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${getSavingsBadgeColor(savings)}`}>
                              SAVE {savings}%
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingId(tier.id)}
                              disabled={deleteTierMutation.isPending}
                              className="h-8 w-8"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteTierMutation.mutate(tier.id)}
                              disabled={deleteTierMutation.isPending}
                              className="h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="text-lg font-bold mb-2">
                          Order {tier.minQuantity}+ units
                        </div>
                        
                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex flex-col items-center bg-white rounded-lg p-3 flex-1">
                            <div className="text-xs text-muted-foreground mb-1">Regular Price</div>
                            <div className="text-lg font-semibold text-muted-foreground line-through">
                              {formatCurrency(basePrice)}
                            </div>
                          </div>
                          
                          <div className="text-2xl text-muted-foreground">→</div>
                          
                          <div className="flex flex-col items-center bg-white rounded-lg p-3 flex-1">
                            <div className="text-xs text-muted-foreground mb-1">Bulk Price</div>
                            <div className="text-2xl font-bold text-green-600">
                              {formatCurrency(Number(tier.price))}
                            </div>
                          </div>
                          
                          <div className="text-2xl text-green-600">=</div>
                          
                          <div className="flex flex-col items-center bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-lg p-3 flex-1">
                            <div className="text-xs mb-1 opacity-90">You Save</div>
                            <div className="text-xl font-bold flex items-center gap-1">
                              <TrendingDown className="h-5 w-5" />
                              {savings}%
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-3 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Savings on {tier.minQuantity} units:</span>
                            <span className="font-bold text-green-600">
                              {formatCurrency((basePrice - Number(tier.price)) * tier.minQuantity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
