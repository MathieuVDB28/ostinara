import { useTranslations } from "next-intl";
import { Frets } from "@/components/ui/frets";
import { useIntlLocale } from "@/i18n/intl-locale";
import {
  BADGES_BY_ID,
  badgeGoalFor,
  badgeTitle,
  tierName,
  type BadgeFamily,
  type BadgeStatus,
} from "@/lib/badges/catalog";
import { BadgeMedal } from "./badge-medal";
import type { Instrument } from "@/types";

interface BadgesViewProps {
  badges: BadgeStatus[];
  /** L'instrument principal : certains titres en dependent. */
  instrument: Instrument;
}

const FAMILIES: BadgeFamily[] = ["repertoire", "pratique", "commu"];

function formatDate(iso: string, intlLocale: string): string {
  return new Date(iso).toLocaleDateString(intlLocale, { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Profil › Badges, style Atelier : une ligne par badge, filets, chiffres
 * en condense. Chaque ligne dit ou on en est et ce qu'il reste a faire.
 */
export function BadgesView({ badges, instrument }: BadgesViewProps) {
  const t = useTranslations("badges");
  const unlocked = badges.filter((badge) => badge.level > 0).length;
  const tierLevels = badges.reduce((sum, badge) => {
    const def = BADGES_BY_ID[badge.id];
    return def?.kind === "tiered" ? sum + badge.level : sum;
  }, 0);
  const tierMax = badges.reduce((sum, badge) => {
    const def = BADGES_BY_ID[badge.id];
    return def?.kind === "tiered" ? sum + def.tiers.length : sum;
  }, 0);

  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-2 gap-3 sm:max-w-sm">
        <Stat label={t("view.unlocked")} value={unlocked} total={badges.length} />
        <Stat label={t("view.levels")} value={tierLevels} total={tierMax} />
      </dl>

      {FAMILIES.map((family) => (
        <section key={family} aria-labelledby={`badges-${family}`}>
          <h2
            id={`badges-${family}`}
            className="border-b border-border pb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
          >
            {t(`family.${family}`)}
          </h2>
          <ul className="lg:grid lg:grid-cols-2 lg:gap-x-10">
            {badges
              .filter((badge) => BADGES_BY_ID[badge.id]?.family === family)
              .map((badge) => (
                <BadgeRow key={badge.id} badge={badge} instrument={instrument} />
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Stat({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <div className="flex flex-col-reverse gap-1">
      <dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </dt>
      <dd className="tabular font-display text-[32px] font-bold leading-none">
        {value}
        <small className="text-[0.55em] text-muted-foreground">/{total}</small>
      </dd>
    </div>
  );
}

function BadgeRow({ badge, instrument }: { badge: BadgeStatus; instrument: Instrument }) {
  const t = useTranslations("badges");
  const intlLocale = useIntlLocale();
  const def = BADGES_BY_ID[badge.id];
  if (!def) return null;

  let status: string;
  let goal: string | null;
  let progress: { value: number; target: number } | null = null;

  if (def.kind === "tiered") {
    const done = badge.next === null;
    status = badge.level > 0 ? tierName(badge.level, t) : t("view.toUnlock");
    goal = done ? t("view.maxed") : badgeGoalFor(def, badge.next!, t);
    if (!done && badge.value !== null) progress = { value: badge.value, target: badge.next! };
  } else {
    status =
      badge.count > 0
        ? t("view.earnedTimes", { count: badge.count })
        : def.kind === "monthly"
          ? t("view.everyMonth")
          : t("view.everyWeek");
    goal = badgeGoalFor(def, def.threshold, t);
    // La semaine se mesure en objectifs du plan, pas en seuil fixe.
    if (def.kind === "monthly" && badge.value !== null) {
      progress = { value: Math.min(badge.value, def.threshold), target: def.threshold };
    }
    if (def.kind === "monthly" && (badge.value ?? 0) >= def.threshold) {
      goal = t("view.doneMonth", { goal });
    }
  }

  return (
    <li className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3.5 border-b border-border py-3">
      <BadgeMedal badgeId={def.id} level={badge.level} count={badge.count} />
      <div className="min-w-0">
        <p className="flex items-baseline justify-between gap-2">
          <span className={`truncate font-display text-xl font-extrabold uppercase leading-tight ${badge.level === 0 ? "text-muted-foreground" : ""}`}>
            {badgeTitle(def.id, instrument, t)}
          </span>
          <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            {status}
          </span>
        </p>
        <p className="truncate text-sm text-muted-foreground">{goal}</p>
        {progress ? (
          <p className="mt-1 flex items-center gap-2">
            <Frets
              value={(Math.min(progress.value, progress.target) / progress.target) * 100}
              label={t("view.progress", { value: progress.value, target: progress.target })}
            />
            <span aria-hidden="true" className="tabular text-xs font-semibold text-muted-foreground">
              {Math.min(progress.value, progress.target)}/{progress.target}
            </span>
          </p>
        ) : (
          badge.unlockedAt && (
            <p className="mt-0.5 text-xs text-muted-foreground">{t("view.on", { date: formatDate(badge.unlockedAt, intlLocale) })}</p>
          )
        )}
      </div>
    </li>
  );
}
