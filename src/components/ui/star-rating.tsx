"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number; // 0 to 5, 0.5 increments
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StarRating({ value, onChange, size = "md", className }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const displayValue = onChange ? (hovered ?? value) : value;

  const sizeClass =
    size === "sm" ? "h-4 w-4" : size === "lg" ? "h-9 w-9" : "h-7 w-7";
  const gapClass = size === "sm" ? "gap-0.5" : size === "lg" ? "gap-1.5" : "gap-1";

  return (
    <div
      className={`flex items-center ${gapClass} ${className ?? ""}`}
      onMouseLeave={() => onChange && setHovered(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFull = displayValue >= star;
        const isHalf = !isFull && displayValue >= star - 0.5;

        return (
          <div key={star} className="relative">
            {/* Base (empty) star */}
            <Star
              className={`${sizeClass} select-none fill-current text-muted-foreground/25`}
              strokeWidth={0}
              aria-hidden="true"
            />

            {/* Filled portion */}
            {(isFull || isHalf) && (
              <Star
                className={`${sizeClass} absolute inset-0 select-none fill-current text-primary`}
                strokeWidth={0}
                style={isHalf ? { clipPath: "inset(0 50% 0 0)" } : undefined}
                aria-hidden="true"
              />
            )}

            {/* Interactive click zones */}
            {onChange && (
              <div className="absolute inset-0 flex cursor-pointer">
                <div
                  className="flex-1"
                  onMouseEnter={() => setHovered(star - 0.5)}
                  onClick={() => { onChange(star - 0.5); setHovered(null); }}
                />
                <div
                  className="flex-1"
                  onMouseEnter={() => setHovered(star)}
                  onClick={() => { onChange(star); setHovered(null); }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
