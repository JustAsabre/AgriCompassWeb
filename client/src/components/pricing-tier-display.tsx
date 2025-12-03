import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, Package } from "lucide-react";
import { PricingTier } from "@shared/schema";
import { formatCurrency } from '@/lib/currency';

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

  const calculateSavings = (tierPrice: number) => {
    return ((basePriceNum - tierPrice) / basePriceNum * 100).toFixed(0);
  };

  const getSavingsBadgeColor = (savings: number) => {
    if (savings >= 25) return "bg-green-600 text-white hover:bg-green-700";
    if (savings >= 15) return "bg-green-500 text-white hover:bg-green-600";
    if (savings >= 10) return "bg-yellow-500 text-white hover:bg-yellow-600";
    return "bg-blue-500 text-white hover:bg-blue-600";
  };

  const getTierBgColor = (index: number, isActive: boolean) => {
    if (isActive) return "bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-400";
    const colors = [
      "bg-green-50 border border-green-200",
      "bg-emerald-50 border border-emerald-200", 
      "bg-teal-50 border border-teal-200",
      "bg-cyan-50 border border-cyan-200",
      "bg-sky-50 border border-sky-200"
    ];
    return colors[index] || colors[0];
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Bulk Pricing Available</CardTitle>
          </div>
          {savings && (
            <Badge className={getSavingsBadgeColor(Number(savings))}>
              <TrendingDown className="h-3 w-3 mr-1" />
              Save {savings}%
            </Badge>
          )}
        </div>
        <CardDescription>
          Order more and save! Get better prices for larger quantities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Base price */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-muted-foreground">Standard Pricing</span>
                <p className="text-xs text-muted-foreground">1 - {sortedTiers[0].minQuantity - 1} {unit || 'units'}</p>
              </div>
              <span className="font-semibold text-lg">{formatCurrency(basePriceNum)}<span className="text-sm text-muted-foreground">/{unit || 'unit'}</span></span>
            </div>
          </div>

          {/* Tier prices */}
          {sortedTiers.map((tier, index) => {
            const isActive = applicableTier?.id === tier.id;
            const nextTier = sortedTiers[index + 1];
            const range = nextTier 
              ? `${tier.minQuantity} - ${nextTier.minQuantity - 1} ${unit || 'units'}`
              : `${tier.minQuantity}+ ${unit || 'units'}`;
            const tierSavings = Number(calculateSavings(Number(tier.price)));

            return (
              <div
                key={tier.id}
                className={`p-3 rounded-lg transition-all ${getTierBgColor(index, isActive)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                      🎯 Tier {index + 1}
                    </span>
                    <Badge className={`${getSavingsBadgeColor(tierSavings)} text-xs font-bold`}>
                      -{tierSavings}%
                    </Badge>
                    {isActive && (
                      <Badge variant="default" className="text-xs bg-green-600">
                        ✓ Applied
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {range}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className={`font-bold text-xl ${isActive ? 'text-green-600' : 'text-foreground'}`}>
                      {formatCurrency(tier.price)}
                    </span>
                    <span className="text-sm text-muted-foreground">/{unit || 'unit'}</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Save {formatCurrency((basePriceNum - Number(tier.price)) * tier.minQuantity)} on {tier.minQuantity} {unit || 'units'}
                </div>
              </div>
            );
          })}
        </div>

        {selectedQuantity > 0 && (
          <div className={`mt-4 p-4 rounded-lg ${
            applicableTier 
              ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white' 
              : 'bg-muted border'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-sm font-semibold ${applicableTier ? 'text-white' : 'text-foreground'}`}>
                Your Order Summary
              </p>
              {savings && (
                <Badge className="bg-white text-green-600 hover:bg-white/90">
                  Saving {savings}%
                </Badge>
              )}
            </div>
            <div className="space-y-1">
              <p className={`text-sm ${applicableTier ? 'text-white/90' : 'text-muted-foreground'}`}>
                Quantity: <span className={`font-medium ${applicableTier ? 'text-white' : 'text-foreground'}`}>{selectedQuantity} {unit || 'units'}</span>
              </p>
              <p className={`text-sm ${applicableTier ? 'text-white/90' : 'text-muted-foreground'}`}>
                Price per {unit || 'unit'}: <span className={`font-medium ${applicableTier ? 'text-white' : 'text-primary'}`}>{formatCurrency(currentPrice)}</span>
              </p>
              <div className="pt-2 mt-2 border-t border-white/20">
                <p className={`text-lg font-bold ${applicableTier ? 'text-white' : 'text-foreground'}`}>
                  Total: {formatCurrency((parseFloat(currentPrice) * selectedQuantity).toFixed(2))}
                </p>
                {applicableTier && (
                  <p className="text-xs text-white/80">
                    You're saving {formatCurrency(((basePriceNum - parseFloat(currentPrice)) * selectedQuantity).toFixed(2))} with bulk pricing!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
