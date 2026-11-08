/**
 * Objectif « tel tempo a telle date » (Pro) : ou l'on en est, et si l'allure
 * des dernieres semaines suffit pour y arriver a temps.
 */

export type TempoGoalStatus = "reached" | "overdue" | "onTrack" | "behind" | "unknown";

export interface TempoGoalProjection {
  status: TempoGoalStatus;
  best: number | null;
  /** Jours restants (negatif : date depassee). */
  daysLeft: number;
  /** BPM a gagner par semaine pour y arriver. */
  neededPerWeek: number | null;
  /** BPM gagnes par semaine sur les 4 dernieres semaines, si on peut le dire. */
  recentPerWeek: number | null;
}

/** Fenetre pour mesurer l'allure recente. */
const WINDOW_DAYS = 28;
const DAY = 24 * 60 * 60 * 1000;

function dayIndex(date: string): number {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY);
}

export function projectTempoGoal(
  points: { date: string; bpm: number }[],
  goalBpm: number,
  goalDate: string,
  today: string
): TempoGoalProjection {
  const now = dayIndex(today);
  const daysLeft = dayIndex(goalDate) - now;
  const best = points.length > 0 ? Math.max(...points.map((point) => point.bpm)) : null;

  if (best !== null && best >= goalBpm) {
    return { status: "reached", best, daysLeft, neededPerWeek: 0, recentPerWeek: null };
  }
  if (daysLeft < 0) {
    return { status: "overdue", best, daysLeft, neededPerWeek: null, recentPerWeek: null };
  }

  const remaining = goalBpm - (best ?? 0);
  const neededPerWeek = best === null ? null : Math.round((remaining / Math.max(daysLeft / 7, 1 / 7)) * 10) / 10;

  // L'allure : le meilleur tempo d'avant la fenetre (ou son premier point)
  // compare au meilleur d'aujourd'hui, ramene a la semaine.
  const start = now - WINDOW_DAYS;
  const before = points.filter((point) => dayIndex(point.date) < start);
  const inside = points.filter((point) => dayIndex(point.date) >= start);
  let recentPerWeek: number | null = null;
  if (inside.length > 0 && best !== null) {
    const baseline = before.length > 0 ? Math.max(...before.map((p) => p.bpm)) : inside[0].bpm;
    const fromDay = before.length > 0 ? start : dayIndex(inside[0].date);
    const span = now - fromDay;
    if (span >= 3 && (before.length > 0 || inside.length >= 2)) {
      recentPerWeek = Math.round(((best - baseline) / (span / 7)) * 10) / 10;
    }
  }

  if (recentPerWeek === null || neededPerWeek === null) {
    return { status: "unknown", best, daysLeft, neededPerWeek, recentPerWeek };
  }
  const projected = (best ?? 0) + (recentPerWeek * daysLeft) / 7;
  return {
    status: projected >= goalBpm ? "onTrack" : "behind",
    best,
    daysLeft,
    neededPerWeek,
    recentPerWeek,
  };
}
