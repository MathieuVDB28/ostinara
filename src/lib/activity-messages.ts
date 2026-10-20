import type { CommonT, Translator } from "@/i18n/types";

/**
 * Ce qu'une activite raconte, apres le nom de son auteur.
 *
 * Partage par la carte du feed (composant client) et l'accueil
 * (composant serveur) : chacun passe son t() du namespace `activity`.
 */
const ACTIVITY_TYPES = [
  "song_added", "song_learning", "song_mastered", "cover_posted", "friend_added",
  "song_wishlisted", "setlist_created", "band_created", "band_joined",
  "challenge_created", "challenge_accepted", "challenge_completed", "challenge_won",
  "album_reviewed", "album_wishlisted", "gear_added", "badge_unlocked",
  "session_completed",
] as const;

type ActivityMessageType = (typeof ACTIVITY_TYPES)[number];

/**
 * `self` : sa propre activite. Le francais garde « Toi a ajouté… », mais
 * l'anglais conjugue (« You have a new friend », pas « You has »).
 */
export function activityMessage(type: string, t: Translator<"activity">, self = false): string {
  if (!(ACTIVITY_TYPES as readonly string[]).includes(type)) return "";
  const key = type as ActivityMessageType;
  return self ? t(`typesSelf.${key}`) : t(`types.${key}`);
}

/** « 5 min », « 3 h », « 2 j », puis la date. */
export function formatActivityDate(dateString: string, t: CommonT, intlLocale: string): string {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t("relative.now");
  if (diffMins < 60) return t("relative.minutesShort", { count: diffMins });
  if (diffHours < 24) return t("relative.hoursShort", { count: diffHours });
  if (diffDays < 7) return t("relative.daysShort", { count: diffDays });
  return date.toLocaleDateString(intlLocale, { day: "numeric", month: "short" });
}
