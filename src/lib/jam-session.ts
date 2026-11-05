/**
 * Une jam sans changement depuis 12 h est une jam oubliee : elle ne doit plus
 * empecher le groupe d'en lancer une autre. Le cron la ferme ; entre deux
 * passages, elle ne compte deja plus comme en cours.
 */
export const JAM_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function isJamSessionStale(session: { updated_at: string }, now = Date.now()): boolean {
  return now - new Date(session.updated_at).getTime() > JAM_SESSION_TTL_MS;
}
