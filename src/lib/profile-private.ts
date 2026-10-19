/**
 * La table profile_private (abonnement, langue, rappels) : lisible par son
 * seul proprietaire, contrairement a `profiles` (cf. docs/profils-prives.md).
 */

/** Les colonnes privees qu'on joint a son propre profil (getMyProfile). */
export const PROFILE_PRIVATE_SELECT =
  "private:profile_private(stripe_customer_id, stripe_subscription_id, subscription_status, subscription_period_end, locale, practice_reminders)";

/**
 * La jointure rend un objet (relation 1-1) ; certaines versions de
 * PostgREST la rendent en tableau. On prend la ligne dans les deux cas.
 */
export function privateRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
