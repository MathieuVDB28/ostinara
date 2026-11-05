import { computeStreak, parisDay } from "@/lib/streak";

export interface ChallengeSession {
  practiced_at: string;
  duration_minutes: number;
}

/**
 * Le score d'un defi, recalcule depuis ses sessions : seules comptent celles
 * jouees pendant le defi, et une session ajoutee, corrigee ou supprimee apres
 * coup compte pour ce qu'elle est. La meilleure serie reste acquise meme si
 * elle s'est cassee depuis (le gagnant est « la plus longue serie »).
 */
export function measureChallenge(
  sessions: ChallengeSession[],
  window: { starts_at: string; ends_at: string | null },
  now: Date = new Date()
): { practice_minutes: number; streak_days: number; streak_last_date: string | null } {
  const start = Date.parse(window.starts_at);
  const end = Math.min(window.ends_at ? Date.parse(window.ends_at) : Infinity, now.getTime());
  const played = sessions.filter((session) => {
    const at = Date.parse(session.practiced_at);
    return at >= start && at <= end;
  });
  const days = played.map((session) => parisDay(session.practiced_at)).sort();

  return {
    practice_minutes: played.reduce((sum, session) => sum + session.duration_minutes, 0),
    streak_days: computeStreak(days, parisDay(now)).longest,
    streak_last_date: days[days.length - 1] ?? null,
  };
}
