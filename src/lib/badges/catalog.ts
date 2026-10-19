/**
 * Le catalogue des badges.
 *
 * Deux sortes :
 * - a paliers (`tiered`) : un seul badge qui monte de niveau — bronze,
 *   argent, or. « Premier morceau maitrise » est le bronze de Repertoire.
 * - recurrents (`monthly`, `weekly`) : a refaire chaque mois ou chaque
 *   semaine, ils se comptent (« ×3 »).
 *
 * Le calcul vit dans src/lib/badges/sync.ts ; ce fichier ne contient que
 * des donnees, lisibles cote client comme cote serveur.
 */

import type { Instrument } from "@/types";
import type { Translator } from "@/i18n/types";

/** Les textes (titres, objectifs, niveaux) : messages/<langue>/badges.json. */
export type BadgesT = Translator<"badges">;

export type BadgeId =
  | "repertoire" | "bibliotheque" | "tempo"
  | "sessions" | "serie" | "heures" | "mois-varie" | "mois-assidu" | "semaine-bouclee"
  | "scene" | "melomane" | "entoure" | "competiteur" | "entraide";

export type BadgeFamily = "repertoire" | "pratique" | "commu";

export type BadgeIcon =
  | "graduation"
  | "library"
  | "gauge"
  | "flame"
  | "clock"
  | "calendar_check"
  | "disc"
  | "video"
  | "users"
  | "trophy"
  | "shuffle"
  | "calendar"
  | "circle_check"
  | "handshake";

interface BadgeBase {
  id: BadgeId;
  family: BadgeFamily;
  /**
   * Les instruments qui ont leur propre titre (catalog.<id>.titles.<instrument>),
   * quand le titre ne parle pas a tous : on ne se fait pas de corne en
   * tenant des baguettes.
   */
  titles?: Instrument[];
  icon: BadgeIcon;
}

export interface TieredBadgeDef extends BadgeBase {
  kind: "tiered";
  /** Seuils des niveaux bronze, argent, or. L'objectif (catalog.<id>.goal) recoit le seuil en {count}. */
  tiers: [number, number, number];
}

export interface RecurringBadgeDef extends BadgeBase {
  kind: "monthly" | "weekly";
  threshold: number;
}

export type BadgeDef = TieredBadgeDef | RecurringBadgeDef;

export const BADGES: BadgeDef[] = [
  // Repertoire
  {
    id: "repertoire",
    kind: "tiered",
    family: "repertoire",
    icon: "graduation",
    tiers: [1, 10, 25],
  },
  {
    id: "bibliotheque",
    kind: "tiered",
    family: "repertoire",
    icon: "library",
    tiers: [1, 10, 50],
  },
  {
    id: "tempo",
    kind: "tiered",
    family: "repertoire",
    icon: "gauge",
    tiers: [1, 5, 15],
  },

  // Pratique
  {
    id: "sessions",
    kind: "tiered",
    family: "pratique",
    icon: "calendar_check",
    tiers: [1, 50, 250],
  },
  {
    id: "serie",
    kind: "tiered",
    family: "pratique",
    icon: "flame",
    tiers: [7, 30, 100],
  },
  {
    id: "heures",
    kind: "tiered",
    family: "pratique",
    titles: ["drums", "keys"],
    icon: "clock",
    tiers: [10, 50, 100],
  },
  {
    id: "mois-varie",
    kind: "monthly",
    family: "pratique",
    icon: "shuffle",
    threshold: 5,
  },
  {
    id: "mois-assidu",
    kind: "monthly",
    family: "pratique",
    icon: "calendar",
    threshold: 20,
  },
  {
    id: "semaine-bouclee",
    kind: "weekly",
    family: "pratique",
    icon: "circle_check",
    threshold: 1,
  },

  // Commu
  {
    id: "scene",
    kind: "tiered",
    family: "commu",
    icon: "video",
    tiers: [1, 3, 10],
  },
  {
    id: "melomane",
    kind: "tiered",
    family: "commu",
    icon: "disc",
    tiers: [1, 10, 50],
  },
  {
    id: "entoure",
    kind: "tiered",
    family: "commu",
    icon: "users",
    tiers: [1, 5, 15],
  },
  {
    id: "competiteur",
    kind: "tiered",
    family: "commu",
    icon: "trophy",
    tiers: [1, 5, 15],
  },
  {
    // Les musiciens aides : auteurs distincts des sujets du forum dont ma
    // reponse a ete choisie comme la meilleure.
    id: "entraide",
    kind: "tiered",
    family: "commu",
    icon: "handshake",
    tiers: [1, 10, 25],
  },
];

export const BADGES_BY_ID: Record<string, BadgeDef | undefined> = Object.fromEntries(
  BADGES.map((badge) => [badge.id, badge])
);

/** Le titre d'un badge pour l'instrument principal de celui qui l'a. */
export function badgeTitle(badgeId: string, instrument: Instrument | null | undefined, t: BadgesT): string {
  const def = BADGES_BY_ID[badgeId];
  if (!def) return t("fallback");
  if (instrument && def.titles?.includes(instrument)) {
    return t(`catalog.${def.id}.titles.${instrument}` as Parameters<BadgesT>[0]);
  }
  return t(`catalog.${def.id}.title`);
}

/** Le nom d'un niveau (« Argent »). */
export function tierName(level: number, t: BadgesT): string {
  return level >= 1 && level <= 3 ? t(`tier.${String(level) as "1" | "2" | "3"}`) : "";
}

/** « Répertoire · Argent », ou le titre seul pour un badge recurrent. */
export function badgeLabel(badgeId: string, level: number, instrument: Instrument | null | undefined, t: BadgesT): string {
  const def = BADGES_BY_ID[badgeId];
  if (!def) return t("fallback");
  const title = badgeTitle(badgeId, instrument, t);
  if (def.kind !== "tiered") return title;
  return `${title} · ${tierName(level, t)}`;
}

/** L'objectif d'un badge a paliers pour un seuil donne. */
export function badgeGoalFor(def: BadgeDef, threshold: number, t: BadgesT): string {
  return t(`catalog.${def.id}.goal`, { count: threshold });
}

/** Ce que le niveau a demande, pour le toast et la notification. */
export function badgeGoal(badgeId: string, level: number, t: BadgesT): string {
  const def = BADGES_BY_ID[badgeId];
  if (!def) return "";
  return badgeGoalFor(def, def.kind === "tiered" ? def.tiers[level - 1] : def.threshold, t);
}

// ---------------------------------------------------------------------------
// Ce que montre l'ecran
// ---------------------------------------------------------------------------

/** Un badge tel qu'on l'affiche : son etat, sa progression. */
export interface BadgeStatus {
  id: string;
  /** 0 = verrouille ; 1 a 3 pour un badge a paliers, 1 pour un recurrent obtenu. */
  level: number;
  /** Nombre de fois obtenu, pour un recurrent. */
  count: number;
  /** Valeur courante (periode en cours pour un recurrent), si connue. */
  value: number | null;
  /** Le prochain seuil, ou null quand tout est obtenu (or) ou inconnu. */
  next: number | null;
  /** Derniere obtention. */
  unlockedAt: string | null;
}

/** Un badge obtenu, tel qu'il est stocke. */
export interface UserBadgeRow {
  id?: string;
  badge_id: string;
  level: number;
  period: string;
  unlocked_at: string;
}

/**
 * L'etat de chaque badge du catalogue, a partir des lignes obtenues et,
 * pour soi, des valeurs courantes. Sans valeurs (le profil d'un ami), on
 * ne montre que ce qui est obtenu.
 */
export function buildBadgeStatuses(
  rows: UserBadgeRow[],
  values?: Record<string, number>
): BadgeStatus[] {
  return BADGES.map((def) => {
    const own = rows.filter((row) => row.badge_id === def.id);
    const level = own.reduce((max, row) => Math.max(max, row.level), 0);
    const unlockedAt =
      own.map((row) => row.unlocked_at).sort().at(-1) ?? null;
    const value = values ? values[def.id] ?? 0 : null;

    if (def.kind === "tiered") {
      return {
        id: def.id,
        level,
        count: own.length,
        value,
        next: level < def.tiers.length ? def.tiers[level] : null,
        unlockedAt,
      };
    }

    return {
      id: def.id,
      level: own.length > 0 ? 1 : 0,
      count: own.length,
      value,
      next: def.threshold,
      unlockedAt,
    };
  });
}
