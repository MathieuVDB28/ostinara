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
  | "circle_check";

interface BadgeBase {
  id: string;
  family: BadgeFamily;
  title: string;
  icon: BadgeIcon;
}

export interface TieredBadgeDef extends BadgeBase {
  kind: "tiered";
  /** Seuils des niveaux bronze, argent, or. */
  tiers: [number, number, number];
  /** L'objectif d'un niveau, ex. « Maîtrise 10 morceaux ». */
  goal: (threshold: number) => string;
}

export interface RecurringBadgeDef extends BadgeBase {
  kind: "monthly" | "weekly";
  threshold: number;
  goal: string;
}

export type BadgeDef = TieredBadgeDef | RecurringBadgeDef;

export const TIER_NAMES = ["Bronze", "Argent", "Or"] as const;

export const FAMILY_LABELS: Record<BadgeFamily, string> = {
  repertoire: "Répertoire",
  pratique: "Pratique",
  commu: "Commu",
};

/** « 1 morceau », « 10 morceaux ». */
function plural(n: number, one: string, many: string): string {
  return `${n} ${n > 1 ? many : one}`;
}

export const BADGES: BadgeDef[] = [
  // Repertoire
  {
    id: "repertoire",
    kind: "tiered",
    family: "repertoire",
    title: "Répertoire",
    icon: "graduation",
    tiers: [1, 10, 25],
    goal: (n) => (n === 1 ? "Maîtrise ton premier morceau" : `Maîtrise ${n} morceaux`),
  },
  {
    id: "bibliotheque",
    kind: "tiered",
    family: "repertoire",
    title: "Bibliothèque",
    icon: "library",
    tiers: [1, 10, 50],
    goal: (n) => (n === 1 ? "Ajoute ton premier morceau" : `Ajoute ${n} morceaux`),
  },
  {
    id: "tempo",
    kind: "tiered",
    family: "repertoire",
    title: "Dans le tempo",
    icon: "gauge",
    tiers: [1, 5, 15],
    goal: (n) =>
      n === 1
        ? "Atteins le tempo cible d'un morceau"
        : `Atteins le tempo cible de ${n} morceaux`,
  },

  // Pratique
  {
    id: "sessions",
    kind: "tiered",
    family: "pratique",
    title: "Assiduité",
    icon: "calendar_check",
    tiers: [1, 50, 250],
    goal: (n) => (n === 1 ? "Enregistre ta première session" : `Enregistre ${n} sessions`),
  },
  {
    id: "serie",
    kind: "tiered",
    family: "pratique",
    title: "Régularité",
    icon: "flame",
    tiers: [7, 30, 100],
    goal: (n) => `Joue ${n} jours d'affilée`,
  },
  {
    id: "heures",
    kind: "tiered",
    family: "pratique",
    title: "Heures de vol",
    icon: "clock",
    tiers: [10, 50, 100],
    goal: (n) => `Cumule ${n} h de pratique`,
  },
  {
    id: "mois-varie",
    kind: "monthly",
    family: "pratique",
    title: "Mois éclectique",
    icon: "shuffle",
    threshold: 5,
    goal: "Joue 5 morceaux différents dans le mois",
  },
  {
    id: "mois-assidu",
    kind: "monthly",
    family: "pratique",
    title: "Mois assidu",
    icon: "calendar",
    threshold: 20,
    goal: "Enregistre 20 sessions dans le mois",
  },
  {
    id: "semaine-bouclee",
    kind: "weekly",
    family: "pratique",
    title: "Semaine bouclée",
    icon: "circle_check",
    threshold: 1,
    goal: "Termine tous les objectifs de ton plan de la semaine",
  },

  // Commu
  {
    id: "scene",
    kind: "tiered",
    family: "commu",
    title: "Sur scène",
    icon: "video",
    tiers: [1, 3, 10],
    goal: (n) => (n === 1 ? "Publie ta première cover" : `Publie ${plural(n, "cover", "covers")}`),
  },
  {
    id: "melomane",
    kind: "tiered",
    family: "commu",
    title: "Mélomane",
    icon: "disc",
    tiers: [1, 10, 50],
    goal: (n) => (n === 1 ? "Note ton premier album" : `Note ${n} albums`),
  },
  {
    id: "entoure",
    kind: "tiered",
    family: "commu",
    title: "Bien entouré",
    icon: "users",
    tiers: [1, 5, 15],
    goal: (n) => (n === 1 ? "Ajoute ton premier ami" : `Compte ${n} amis`),
  },
  {
    id: "competiteur",
    kind: "tiered",
    family: "commu",
    title: "Compétiteur",
    icon: "trophy",
    tiers: [1, 5, 15],
    goal: (n) => (n === 1 ? "Remporte ton premier défi" : `Remporte ${n} défis`),
  },
];

export const BADGES_BY_ID: Record<string, BadgeDef> = Object.fromEntries(
  BADGES.map((badge) => [badge.id, badge])
);

/** « Répertoire · Argent », ou le titre seul pour un badge recurrent. */
export function badgeLabel(badgeId: string, level: number): string {
  const def = BADGES_BY_ID[badgeId];
  if (!def) return "Badge";
  if (def.kind !== "tiered") return def.title;
  return `${def.title} · ${TIER_NAMES[level - 1] ?? ""}`;
}

/** Ce que le niveau a demande, pour le toast et la notification. */
export function badgeGoal(badgeId: string, level: number): string {
  const def = BADGES_BY_ID[badgeId];
  if (!def) return "";
  return def.kind === "tiered" ? def.goal(def.tiers[level - 1]) : def.goal;
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
