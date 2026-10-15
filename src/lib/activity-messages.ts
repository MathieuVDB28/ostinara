/**
 * Ce qu'une activite raconte, apres le nom de son auteur.
 *
 * Partage par la carte du feed (composant client) et l'accueil
 * (composant serveur) : une constante exportee d'un module « use client »
 * n'arrive cote serveur que comme reference, pas comme valeur.
 */
export const ACTIVITY_MESSAGES: Record<string, string> = {
  song_added: "a ajouté un nouveau morceau",
  song_learning: "a commencé à apprendre un morceau",
  song_mastered: "a maîtrisé un morceau",
  cover_posted: "a posté une cover",
  friend_added: "a un nouvel ami",
  song_wishlisted: "veut apprendre",
  setlist_created: "a créé une setlist",
  band_created: "a créé un groupe",
  band_joined: "a rejoint un groupe",
  challenge_created: "a lancé un défi",
  challenge_accepted: "a accepté un défi",
  challenge_completed: "a terminé un défi",
  challenge_won: "a remporté un défi !",
  album_reviewed: "a écouté un album",
  album_wishlisted: "veut écouter un album",
  gear_added: "a ajouté du matos à sa collection",
  badge_unlocked: "a débloqué un badge",
};

/** « 5 min », « 3 h », « 2 j », puis la date. */
export function formatActivityDate(dateString: string): string {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "à l'instant";
  if (diffMins < 60) return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours} h`;
  if (diffDays < 7) return `${diffDays} j`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
