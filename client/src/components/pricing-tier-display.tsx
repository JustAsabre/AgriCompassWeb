import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown } from "lucide-react";
import { PricingTier } from "@shared/schema";

interface PricingTierDisplayProps {
  basePrice: number | string;
  tiers: PricingTier[];
  unit?: string;
  selectedQuantity?: number;
}

export function PricingTierDisplay({ basePrice, tiers, unit, selectedQuantity = 0 }: PricingTierDisplayProps) {
  if (tiers.length === 0) {
    return null;
  }

  const basePriceNum = typeof basePrice === 'string' ? parseFloat(basePrice) : basePrice;
  const sortedTiers = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);
  
  // Calculate which tier applies
  const applicableTier = sortedTiers
    .filter(t => selectedQuantity >= t.minQuantity)
    .sort((a, b) => b.minQuantity - a.minQuantity)[0];

  const currentPrice = applicableTier ? applicableTier.price : basePriceNum.toString();
  const savings = applicableTier 
    ? ((basePriceNum - parseFloat(applicableTier.price)) / basePriceNum * 100).toFixed(0)
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Bulk Pricing</CardTitle>
          {savings && (
            <Badge variant="secondary" className="gap-1">
              <TrendingDown className="h-3 w-3" />
              Save {savings}%
            </Badge>
          )}
        </div>
        <CardDescription>
          Get better prices when you order in bulk
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Base price */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <span className="text-sm">1 - {sortedTiers[0].minQuantity - 1} {unit || 'units'}</span>
            <span className="font-medium">${basePriceNum.toFixed(2)}/{unit || 'unit'}</span>
          </div>

          {/* Tier prices */}
          {sortedTiers.map((tier, index) => {
            const isActive = applicableTier?.id === tier.id;
            const nextTier = sortedTiers[index + 1];
            const range = nextTier 
              ? `${tier.minQuantity} - ${nextTier.minQuantity - 1} ${unit || 'units'}`
              : `${tier.minQuantity}+ ${unit || 'units'}`;

            return (
              <div
                key={tier.id}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  isActive ? 'bg-primary/10 border border-primary' : 'bg-muted/50'
                }`}
              >
                <span className={`text-sm ${isActive ? 'font-medium' : ''}`}>
                  {range}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${isActive ? 'text-primary' : ''}`}>
                    ${tier.price}/{unit || 'unit'}
                  </span>
                  {isActive && (
                    <Badge variant="default" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {selectedQuantity > 0 && applicableTier && (
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground">
              Your quantity: <span className="font-medium text-foreground">{selectedQuantity} {unit || 'units'}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Your price: <span className="font-medium text-primary">${currentPrice}/{unit || 'unit'}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Total: <span className="font-medium text-foreground">
                ${(parseFloat(currentPrice) * selectedQuantity).toFixed(2)}
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
