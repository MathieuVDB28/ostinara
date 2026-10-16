import { Guitar } from "lucide-react";
import type { CoverGearTag } from "@/types";

/**
 * « Joué avec Fender Stratocaster · Boss DS-1 ».
 *
 * Les instruments d'abord : c'est ce qu'on demande en premier en voyant
 * une cover. Rien n'est rendu sans matos.
 */
const ORDER = ["guitar", "bass", "amp", "effect", "recording", "accessory", "other"];

export function CoverGearLine({ gear, className = "" }: { gear?: CoverGearTag[]; className?: string }) {
  if (!gear || gear.length === 0) return null;

  const names = [...gear]
    .sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type))
    .map((item) => `${item.brand} ${item.model}`.trim());

  return (
    <p className={`flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
      <Guitar className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <span className="truncate">
        Joué avec <span className="font-semibold text-foreground">{names.join(" · ")}</span>
      </span>
    </p>
  );
}
