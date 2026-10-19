/**
 * Les colonnes d'un profil qu'on peut montrer a quelqu'un d'autre : ce que
 * les pages de profil, d'ami et le feed affichent, rien de plus.
 *
 * Le profil d'un autre ne se lit jamais en `select("*")` : la ligne porte
 * aussi l'abonnement (stripe_*, subscription_status), la langue, les
 * reglages de rappels… et ce qu'une Server Action rend part tel quel dans
 * la page. Son propre profil, lui, peut se lire en entier.
 */
// Une seule chaine litterale : le client Supabase en deduit le type des lignes.
export const PUBLIC_PROFILE_COLUMNS =
  "id, username, display_name, avatar_url, bio, plan, is_private, instagram_url, tiktok_url, twitter_url, facebook_url, staff_role, created_at" as const;
