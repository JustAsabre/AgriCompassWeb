import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  reviewCount?: number;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  className?: string;
}

export function RatingStars({ 
  rating, 
  reviewCount, 
  size = "md", 
  showCount = true,
  className 
}: RatingStarsProps) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  const starSize = sizeClasses[size];
  const textSize = textSizeClasses[size];

  // Round to nearest 0.5
  const roundedRating = Math.round(rating * 2) / 2;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = roundedRating >= star;
          const halfFilled = roundedRating >= star - 0.5 && roundedRating < star;

          return (
            <div key={star} className="relative">
              {halfFilled ? (
                <>
                  <Star className={cn(starSize, "text-muted-foreground")} />
                  <Star 
                    className={cn(starSize, "absolute top-0 left-0 text-yellow-500 fill-yellow-500")} 
                    style={{ clipPath: "inset(0 50% 0 0)" }}
                  />
                </>
              ) : (
                <Star 
                  className={cn(
                    starSize,
                    filled ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      {showCount && reviewCount !== undefined && (
        <span className={cn("text-muted-foreground", textSize)}>
          {rating.toFixed(1)} ({reviewCount})
        </span>
      )}
      {showCount && reviewCount === undefined && (
        <span className={cn("text-muted-foreground", textSize)}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

