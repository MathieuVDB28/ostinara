import type { UserPlan } from "@/types";

/**
 * L'offre de lancement de la liste d'attente (/acces-anticipe) : les N
 * premiers inscrits ont quelques mois offerts sur le plan qu'ils ont
 * choisi — Pro pour ceux qui ont choisi Free, sinon l'offre ne leur
 * donnerait rien.
 *
 * Partage entre la page, le formulaire et l'email de confirmation : changer
 * le nombre de places ou la duree ici suffit.
 */
export const EARLY_BIRD = {
  /** Les N premiers inscrits en profitent. */
  spots: 200,
  /** Mois offerts sur le plan choisi. */
  months: 3,
} as const;

/** Le plan offert pour un plan choisi. */
export function offeredPlan(plan: UserPlan): Exclude<UserPlan, "free"> {
  return plan === "free" ? "pro" : plan;
}

/** Le rang donne-t-il droit a l'offre ? */
export function isEarlyBird(rank: number | null | undefined): boolean {
  return typeof rank === "number" && rank > 0 && rank <= EARLY_BIRD.spots;
}
