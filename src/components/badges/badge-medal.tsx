import {
  CalendarCheck,
  CalendarDays,
  CircleCheck,
  Clock,
  Disc3,
  Flame,
  Gauge,
  GraduationCap,
  Handshake,
  Library,
  Shuffle,
  Trophy,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import { BADGES_BY_ID, type BadgeIcon } from "@/lib/badges/catalog";

const ICONS: Record<BadgeIcon, LucideIcon> = {
  graduation: GraduationCap,
  library: Library,
  gauge: Gauge,
  flame: Flame,
  clock: Clock,
  calendar_check: CalendarCheck,
  disc: Disc3,
  video: Video,
  users: Users,
  trophy: Trophy,
  shuffle: Shuffle,
  calendar: CalendarDays,
  circle_check: CircleCheck,
  handshake: Handshake,
};

interface BadgeMedalProps {
  badgeId: string;
  /** 0 = verrouille. */
  level: number;
  /** Pour un badge recurrent : nombre d'obtentions, affiche « ×3 ». */
  count?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: { box: "h-10 w-10", icon: "h-[18px] w-[18px]", pip: "h-1 w-2" },
  md: { box: "h-14 w-14", icon: "h-6 w-6", pip: "h-1 w-2.5" },
  lg: { box: "h-20 w-20", icon: "h-9 w-9", pip: "h-1.5 w-3.5" },
};

/**
 * Une medaille : un rond, l'icone du badge, et le niveau en encoches.
 *
 * Pas de bronze, d'argent ni d'or en couleur : la palette ne bouge pas
 * (docs/refonte-ui.md). Le niveau se lit au nombre d'encoches pleines,
 * comme la progression se lit aux frettes. Verrouille, le rond est en
 * pointilles et l'icone s'efface.
 */
export function BadgeMedal({ badgeId, level, count = 0, size = "md", className = "" }: BadgeMedalProps) {
  const def = BADGES_BY_ID[badgeId];
  if (!def) return null;

  const Icon = ICONS[def.icon];
  const s = SIZES[size];
  const locked = level === 0;
  const tiers = def.kind === "tiered" ? def.tiers.length : 0;

  return (
    <span className={`inline-flex shrink-0 flex-col items-center gap-1 ${className}`} aria-hidden="true">
      <span
        className={`relative flex items-center justify-center rounded-full ${s.box} ${
          locked
            ? "border border-dashed border-border text-muted-foreground/50"
            : level === 3
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-secondary text-foreground"
        }`}
      >
        <Icon className={s.icon} strokeWidth={1.75} />
        {def.kind !== "tiered" && count > 1 && (
          <span className="tabular absolute -right-1 -top-1 rounded-full bg-foreground px-1.5 text-[10px] font-bold leading-4 text-background">
            ×{count}
          </span>
        )}
      </span>
      {tiers > 0 && (
        <span className="flex gap-0.5">
          {Array.from({ length: tiers }, (_, i) => (
            <span key={i} className={`${s.pip} rounded-[1px] ${i < level ? "bg-primary" : "bg-muted"}`} />
          ))}
        </span>
      )}
    </span>
  );
}
