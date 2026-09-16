"use client";

import { useState } from "react";
import type { GearItem, GearType, GearCondition } from "@/types";
import {
  GEAR_TYPE_LABELS,
  GEAR_CONDITION_LABELS,
  GEAR_CONDITION_COLORS,
} from "@/types";

interface GearCardProps {
  gear: GearItem;
  onClick: () => void;
}

function GearTypeIcon({
  type,
  className = "w-8 h-8",
}: {
  type: GearType;
  className?: string;
}) {
  const iconColor = "currentColor";

  switch (type) {
    case "guitar":
    case "bass":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11.5 2l1 2.5L14 6l-1.5 1.5L14 9l-2 1-1 3.5c-.3 1-.8 2-1.8 2.8-1.5 1.2-2.5 2.2-2.5 3.7a3 3 0 006 0c0-1-.3-1.7-.7-2.3" />
          <circle cx="10.5" cy="18" r="1" />
          <path d="M14 6l3-3" />
          <path d="M15.5 2.5l2 2" />
        </svg>
      );
    case "amp":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="12" cy="14" r="4" />
          <circle cx="12" cy="14" r="2" />
          <line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="2" />
          <line x1="10" y1="7" x2="10.01" y2="7" strokeWidth="2" />
          <line x1="13" y1="7" x2="17" y2="7" />
        </svg>
      );
    case "effect":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="4" y="6" width="16" height="14" rx="2" />
          <circle cx="12" cy="15" r="3" />
          <circle cx="8" cy="10" r="1" />
          <circle cx="12" cy="10" r="1" />
          <circle cx="16" cy="10" r="1" />
          <line x1="4" y1="6" x2="8" y2="3" />
          <line x1="20" y1="6" x2="16" y2="3" />
        </svg>
      );
    case "accessory":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
        </svg>
      );
    case "recording":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
          <path d="M19 10v2a7 7 0 01-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      );
    default:
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4l3 3" />
        </svg>
      );
  }
}

export { GearTypeIcon };

export function GearCard({ gear, onClick }: GearCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const title = [gear.brand, gear.model].filter(Boolean).join(" ");
  const subtitle = [gear.year ? String(gear.year) : null, GEAR_TYPE_LABELS[gear.type]]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      onClick={onClick}
      className="group flex cursor-pointer items-center gap-3 rounded-xl border border-border/50 bg-card p-4 transition-all hover:border-primary/40 hover:bg-primary/[0.02]"
    >
      {/* Thumbnail */}
      <div className="flex h-[80px] w-[80px] flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/50">
        {gear.image_url ? (
          <img
            src={gear.image_url}
            alt={title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="text-muted-foreground/60">
            <GearTypeIcon type={gear.type} className="h-8 w-8" />
          </div>
        )}
      </div>

      {/* Center content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="truncate text-sm font-semibold">{title || "Sans nom"}</h3>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {gear.condition && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${GEAR_CONDITION_COLORS[gear.condition]}`}
            >
              {GEAR_CONDITION_LABELS[gear.condition]}
            </span>
          )}
          {gear.is_active && (
            <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-medium text-success dark:text-success">
              Actif
            </span>
          )}
        </div>
      </div>

      {/* More menu */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-all hover:bg-muted group-hover:opacity-100"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
    </div>
  );
}
