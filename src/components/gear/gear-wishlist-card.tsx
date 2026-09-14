"use client";

import type { GearWishlistItem } from "@/types";
import {
  GEAR_TYPE_LABELS,
  GEAR_PRIORITY_LABELS,
  GEAR_PRIORITY_COLORS,
} from "@/types";
import { GearTypeIcon } from "./gear-card";

interface GearWishlistCardProps {
  item: GearWishlistItem;
  onRemove: () => void;
}

export function GearWishlistCard({ item, onRemove }: GearWishlistCardProps) {
  const title = [item.brand, item.model].filter(Boolean).join(" ");

  return (
    <div className="group flex items-start gap-3 rounded-xl border border-border/50 bg-card p-4 transition-all hover:border-primary/40 hover:bg-primary/[0.02]">
      {/* Type icon */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted/50">
        <GearTypeIcon type={item.type} className="h-5 w-5 text-muted-foreground/60" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Title */}
        <h3 className="truncate text-sm font-semibold">{title || "Sans nom"}</h3>

        {/* Badges */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium">
            {GEAR_TYPE_LABELS[item.type]}
          </span>
          {item.priority && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${GEAR_PRIORITY_COLORS[item.priority]}`}
            >
              {GEAR_PRIORITY_LABELS[item.priority]}
            </span>
          )}
        </div>

        {/* Estimated price */}
        {item.estimated_price != null && (
          <p className="mt-2 text-xs text-muted-foreground">
            Prix estimé :{" "}
            <span className="font-medium text-foreground">
              {item.estimated_price.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}
            </span>
          </p>
        )}

        {/* Notes */}
        {item.notes && (
          <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
            {item.notes}
          </p>
        )}

        {/* URL link */}
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            <span>Voir le lien</span>
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        )}
      </div>

      {/* Remove button */}
      <button aria-label="Retirer de la wishlist"
        onClick={onRemove}
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-all hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
        title="Retirer de la wishlist"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
      </button>
    </div>
  );
}
