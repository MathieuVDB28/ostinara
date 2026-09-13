"use client";

import type { GearSetupWithItems } from "@/types";
import { GEAR_TYPE_LABELS } from "@/types";
import { GearTypeIcon } from "./gear-card";

interface GearSetupCardProps {
  setup: GearSetupWithItems;
  onEdit: () => void;
  onDelete: () => void;
  onRemoveItem: (gearId: string) => void;
}

export function GearSetupCard({
  setup,
  onEdit,
  onDelete,
  onRemoveItem,
}: GearSetupCardProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 transition-all hover:border-primary/40 hover:bg-primary/[0.02]">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{setup.name}</h3>
          {setup.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {setup.description}
            </p>
          )}
        </div>
        <div className="ml-2 flex items-center gap-1">
          <button aria-label="Modifier le setup"
            onClick={onEdit}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
            title="Modifier"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button aria-label="Supprimer le setup"
            onClick={onDelete}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
            title="Supprimer"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Gear items list */}
      {setup.items && setup.items.length > 0 ? (
        <div className="space-y-2">
          {setup.items.map((item) => {
            const gear = item.gear;
            if (!gear) return null;

            const itemTitle = [gear.brand, gear.model].filter(Boolean).join(" ");

            return (
              <div
                key={item.id}
                className="group/item flex items-center gap-2.5 rounded-lg border border-border/30 bg-background/50 p-2 transition-all"
              >
                {/* Mini thumbnail */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/50">
                  {gear.image_url ? (
                    <img
                      src={gear.image_url}
                      alt={itemTitle}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <GearTypeIcon type={gear.type} className="h-4 w-4 text-muted-foreground/50" />
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">
                    {itemTitle || "Sans nom"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {GEAR_TYPE_LABELS[gear.type]}
                  </p>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => onRemoveItem(gear.id)}
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-all hover:bg-red-500/10 hover:text-red-500 group-hover/item:opacity-100"
                  title="Retirer du setup"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border/50 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            Aucun matériel dans ce setup
          </p>
        </div>
      )}

      {/* Item count */}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          {setup.items?.length || 0} élément{(setup.items?.length || 0) !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
