import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { getWeeklyPlan } from "@/lib/actions/weekly-plan";
import { sendPushNotification } from "@/lib/notifications";
import { songTargetBpm } from "@/lib/song-progress";
import {
  BADGES,
  badgeGoal,
  badgeLabel,
  buildBadgeStatuses,
  type BadgeStatus,
  type UserBadgeRow,
} from "./catalog";

/**
 * Ou un badge en est : sa valeur courante, et la date a laquelle chaque
 * seuil a ete franchi. Les dates viennent de l'historique — c'est ce qui
 * permet d'attribuer les badges retroactivement a leur vraie date.
 */
interface Metric {
  value: number;
  reachedAt: (threshold: number) => string | null;
}

/** Une metrique de comptage : le N-ieme evenement date le seuil N. */
function countMetric(dates: string[]): Metric {
  const sorted = [...dates].sort();
  return {
    value: sorted.length,
    reachedAt: (threshold) => sorted[threshold - 1] ?? null,
  };
}

const PARIS_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** « 2026-10-15 », le jour a Paris : une session a 23 h 30 compte pour ce soir-la. */
function parisDay(iso: string): string {
  return PARIS_DAY.format(new Date(iso));
}

function dayNumber(day: string): number {
  return Math.round(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
}

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role credentials not configured");
  return createServiceRoleClient(url, key);
}

interface SessionRow {
  practiced_at: string;
  duration_minutes: number;
  song_id: string | null;
  bpm_achieved: number | null;
}

/** La plus longue serie de jours consecutifs, et quand chaque longueur a ete atteinte. */
function streakMetric(sessions: SessionRow[]): Metric {
  // Le premier instant de chaque jour joue, dans l'ordre.
  const firstByDay = new Map<string, string>();
  for (const session of [...sessions].sort((a, b) => a.practiced_at.localeCompare(b.practiced_at))) {
    const day = parisDay(session.practiced_at);
    if (!firstByDay.has(day)) firstByDay.set(day, session.practiced_at);
  }

  const reached: string[] = []; // reached[n - 1] = date ou la serie a atteint n jours
  let run = 0;
  let previous: number | null = null;
  for (const [day, iso] of firstByDay) {
    const n = dayNumber(day);
    run = previous !== null && n - previous === 1 ? run + 1 : 1;
    previous = n;
    if (run > reached.length) reached.push(iso);
  }

  return {
    value: reached.length,
    reachedAt: (threshold) => reached[threshold - 1] ?? null,
  };
}

/** Les heures cumulees ; le seuil est franchi par la session qui le depasse. */
function hoursMetric(sessions: SessionRow[]): Metric {
  const sorted = [...sessions].sort((a, b) => a.practiced_at.localeCompare(b.practiced_at));
  const total = sorted.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  return {
    value: Math.floor(total / 60),
    reachedAt: (threshold) => {
      let cumulative = 0;
      for (const session of sorted) {
        cumulative += session.duration_minutes || 0;
        if (cumulative >= threshold * 60) return session.practiced_at;
      }
      return null;
    },
  };
}

interface Evaluation {
  /** Tout ce qui est merite, avec sa date. */
  earned: UserBadgeRow[];
  /** Valeurs courantes, pour la progression a l'ecran. */
  values: Record<string, number>;
}

/** Lit l'historique d'un compte et en deduit les badges merites. */
async function evaluateBadges(userId: string): Promise<Evaluation> {
  const supabase = await createClient();

  const [
    { data: songs },
    { data: sessions },
    { data: covers },
    { data: albums },
    { data: friendships },
    { data: challenges },
    { data: masteredActivities },
    weeklyPlan,
  ] = await Promise.all([
    supabase
      .from("songs")
      .select("id, status, created_at, updated_at, target_bpm, tab_bpm, spotify_bpm")
      .eq("user_id", userId),
    supabase
      .from("practice_sessions")
      .select("practiced_at, duration_minutes, song_id, bpm_achieved")
      .eq("user_id", userId),
    supabase.from("covers").select("created_at").eq("user_id", userId),
    supabase.from("album_reviews").select("created_at").eq("user_id", userId),
    supabase
      .from("friendships")
      .select("updated_at, created_at")
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
    supabase.from("challenges").select("updated_at").eq("winner_id", userId),
    // La date de maitrise : l'activite publiee a ce moment-la. Le
    // `updated_at` du morceau bouge a chaque modification.
    supabase
      .from("activities")
      .select("reference_id, created_at")
      .eq("user_id", userId)
      .eq("type", "song_mastered"),
    getWeeklyPlan(),
  ]);

  const songRows = songs ?? [];
  const sessionRows = (sessions ?? []) as SessionRow[];

  const masteredAt = new Map<string, string>();
  for (const activity of masteredActivities ?? []) {
    if (!activity.reference_id) continue;
    const known = masteredAt.get(activity.reference_id);
    if (!known || activity.created_at < known) masteredAt.set(activity.reference_id, activity.created_at);
  }

  // Le tempo cible d'un morceau, atteint par la premiere session qui le tient.
  const tempoDates: string[] = [];
  for (const song of songRows) {
    const target = songTargetBpm(song);
    if (!target) continue;
    const first = sessionRows
      .filter((s) => s.song_id === song.id && (s.bpm_achieved ?? 0) >= target.bpm)
      .map((s) => s.practiced_at)
      .sort()[0];
    if (first) tempoDates.push(first);
  }

  const metrics: Record<string, Metric> = {
    repertoire: countMetric(
      songRows
        .filter((song) => song.status === "mastered")
        .map((song) => masteredAt.get(song.id) ?? song.updated_at)
    ),
    bibliotheque: countMetric(songRows.map((song) => song.created_at)),
    tempo: countMetric(tempoDates),
    sessions: countMetric(sessionRows.map((s) => s.practiced_at)),
    serie: streakMetric(sessionRows),
    heures: hoursMetric(sessionRows),
    scene: countMetric((covers ?? []).map((c) => c.created_at)),
    melomane: countMetric((albums ?? []).map((a) => a.created_at)),
    entoure: countMetric((friendships ?? []).map((f) => f.updated_at ?? f.created_at)),
    competiteur: countMetric((challenges ?? []).map((c) => c.updated_at)),
  };

  const earned: UserBadgeRow[] = [];
  const values: Record<string, number> = {};

  for (const def of BADGES) {
    if (def.kind !== "tiered") continue;
    const metric = metrics[def.id];
    values[def.id] = metric.value;
    def.tiers.forEach((threshold, index) => {
      const at = metric.reachedAt(threshold);
      if (at) earned.push({ badge_id: def.id, level: index + 1, period: "", unlocked_at: at });
    });
  }

  /*
   * Les badges du mois, sur tout l'historique : chaque mois ou le seuil a
   * ete atteint compte, date de la session qui l'a franchi.
   */
  const byMonth = new Map<string, SessionRow[]>();
  for (const session of [...sessionRows].sort((a, b) => a.practiced_at.localeCompare(b.practiced_at))) {
    const month = parisDay(session.practiced_at).slice(0, 7);
    byMonth.set(month, [...(byMonth.get(month) ?? []), session]);
  }

  const currentMonth = parisDay(new Date().toISOString()).slice(0, 7);
  values["mois-varie"] = 0;
  values["mois-assidu"] = 0;

  for (const [month, monthSessions] of byMonth) {
    const songsSeen = new Set<string>();
    let variedAt: string | null = null;
    monthSessions.forEach((session, index) => {
      if (session.song_id) songsSeen.add(session.song_id);
      if (!variedAt && songsSeen.size >= 5) variedAt = session.practiced_at;
      if (index + 1 === 20) {
        earned.push({ badge_id: "mois-assidu", level: 1, period: month, unlocked_at: session.practiced_at });
      }
    });
    if (variedAt) earned.push({ badge_id: "mois-varie", level: 1, period: month, unlocked_at: variedAt });

    if (month === currentMonth) {
      values["mois-varie"] = songsSeen.size;
      values["mois-assidu"] = monthSessions.length;
    }
  }

  // La semaine bouclee : seulement la semaine en cours, le plan des
  // semaines passees n'est pas relu.
  values["semaine-bouclee"] = weeklyPlan?.completedCount ?? 0;
  if (weeklyPlan && weeklyPlan.goals.length > 0 && weeklyPlan.completedCount === weeklyPlan.goals.length) {
    earned.push({
      badge_id: "semaine-bouclee",
      level: 1,
      period: weeklyPlan.weekStart,
      unlocked_at: new Date().toISOString(),
    });
  }

  return { earned, values };
}

const rowKey = (row: Pick<UserBadgeRow, "badge_id" | "level" | "period">) =>
  `${row.badge_id}|${row.level}|${row.period}`;

/**
 * Verifie les badges du compte connecte et enregistre les nouveaux.
 *
 * Appelee apres chaque action qui peut en debloquer un (session, morceau
 * maitrise, album note, cover, ami, objectif) et au chargement de
 * l'accueil et de la page Badges — pour ce qui arrive sans que l'on
 * agisse : un ami qui accepte, un defi gagne a l'echeance.
 *
 * Un nouveau badge part dans le feed et en notification, puis en toast a
 * la page suivante (cf. BadgeToaster). La toute premiere verification d'un
 * compte attribue l'historique sans bruit.
 *
 * `revalidate: false` depuis un rendu de page, ou revalidatePath est
 * interdit. Ne jette jamais : un badge rate ne doit pas faire echouer
 * l'enregistrement d'une session.
 */
export async function syncBadges(
  { revalidate = true }: { revalidate?: boolean } = {}
): Promise<BadgeStatus[] | null> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return null;

    const admin = getServiceRoleSupabase();

    const [{ earned, values }, { data: existing }, { data: profile }] = await Promise.all([
      evaluateBadges(user.id),
      admin.from("user_badges").select("badge_id, level, period, unlocked_at").eq("user_id", user.id),
      admin.from("profiles").select("badges_synced_at").eq("id", user.id).single(),
    ]);

    const rows = (existing ?? []) as UserBadgeRow[];
    const known = new Set(rows.map(rowKey));
    const fresh = earned.filter((row) => !known.has(rowKey(row)));
    const silent = !profile?.badges_synced_at;
    const now = new Date().toISOString();

    if (fresh.length > 0) {
      const { error } = await admin.from("user_badges").upsert(
        fresh.map((row) => ({
          user_id: user.id,
          badge_id: row.badge_id,
          level: row.level,
          period: row.period,
          // Un badge gagne maintenant porte la date de maintenant ; seul
          // l'historique garde sa date d'origine.
          unlocked_at: silent ? row.unlocked_at : now,
          seen_at: silent ? now : null,
        })),
        { onConflict: "user_id,badge_id,level,period", ignoreDuplicates: true }
      );

      if (error) {
        console.error("Error saving badges:", error);
        return buildBadgeStatuses(rows, values);
      }

      if (!silent) {
        // Un seul post par badge : passer de rien a argent d'un coup
        // n'annonce que l'argent.
        const highest = new Map<string, UserBadgeRow>();
        for (const row of fresh) {
          const current = highest.get(row.badge_id);
          if (!current || row.level > current.level) highest.set(row.badge_id, row);
        }

        for (const row of highest.values()) {
          const label = badgeLabel(row.badge_id, row.level);
          // Insertion directe plutot que createActivity : celle-ci
          // revalide /feed, ce qu'un rendu de page n'a pas le droit de
          // faire. Les amis ne recoivent pas de notification pour un badge.
          await admin.from("activities").insert({
            user_id: user.id,
            type: "badge_unlocked",
            reference_id: null,
            metadata: { badge_id: row.badge_id, level: row.level, period: row.period, title: label },
          });
          after(() =>
            sendPushNotification(
              user.id,
              {
                title: "Badge débloqué",
                body: `${label} — ${badgeGoal(row.badge_id, row.level)}`,
                tag: `badge-${row.badge_id}`,
                data: { url: "/profil/badges" },
              },
              "badge_unlocked"
            )
          );
        }
      }
    }

    if (silent || fresh.length > 0) {
      await admin.from("profiles").update({ badges_synced_at: now }).eq("id", user.id);
    }

    // Le toast vit dans le layout : il faut le re-rendre.
    if (revalidate && fresh.length > 0 && !silent) {
      revalidatePath("/", "layout");
    }

    return buildBadgeStatuses([...rows, ...fresh], values);
  } catch (error) {
    // Les signaux internes de Next (rendu dynamique, redirection) doivent
    // remonter ; seules les vraies erreurs sont avalees.
    unstable_rethrow(error);
    console.error("Error syncing badges:", error);
    return null;
  }
}
