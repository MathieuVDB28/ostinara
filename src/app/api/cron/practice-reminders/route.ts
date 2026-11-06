import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushNotification } from "@/lib/notifications";
import {
  REMINDER_TYPES,
  isStreakLastChance,
  pickReminder,
  type ReminderInput,
} from "@/lib/notifications/practice-reminders";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { JAM_SESSION_TTL_MS } from "@/lib/jam-session";
import { LIVE_SESSION_TTL_MS } from "@/lib/live-session";
import { isGoalDone, type MeasureInput } from "@/lib/weekly-plan-measure";
import type { PracticeSession, Song, WeeklyGoal } from "@/types";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TIME_ZONE = "Europe/Paris";
/** Assez pour une serie et une pause ; le dernier passage par morceau est lu a part. */
const HISTORY_DAYS = 60;

/**
 * Sans secret, la route n'est ouverte qu'en developpement : en prod elle
 * enverrait des notifications a toute la base a chaque appel.
 */
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** Une date en YYYY-MM-DD, a l'heure de Paris. */
function parisDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);
}

function parisWeekday(date: Date): number {
  const short = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short" }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(short);
}

function mondayOf(today: string, weekday: number): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (weekday === 0 ? 6 : weekday - 1));
  return d.toISOString().slice(0, 10);
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    map.set(k, [...(map.get(k) ?? []), row]);
  }
  return map;
}

/**
 * Les rappels de pratique, une fois par jour en fin d'apres-midi.
 *
 * Ne concerne que les personnes abonnees aux notifications et qui n'ont
 * pas coupe « Rappels de pratique ». Les regles sont dans
 * lib/notifications/practice-reminders.ts ; ici, on lit la base en
 * quelques requetes groupees, pas une serie par personne.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Les sessions en direct finies ou oubliees, et leur chat avec elles.
  const liveCutoff = new Date(now.getTime() - LIVE_SESSION_TTL_MS).toISOString();
  const { error: liveError } = await supabaseAdmin
    .from("live_sessions")
    .delete()
    .or(`updated_at.lt.${liveCutoff},ended_at.lt.${liveCutoff}`);
  if (liveError) console.error("[practice-reminders] live sessions:", liveError);

  // Les jams oubliees : le trigger efface leur chat.
  const { error: jamError } = await supabaseAdmin
    .from("jam_sessions")
    .update({ status: "ended", ended_at: now.toISOString() })
    .in("status", ["waiting", "active", "paused"])
    .lt("updated_at", new Date(now.getTime() - JAM_SESSION_TTL_MS).toISOString());
  if (jamError) console.error("[practice-reminders] jam sessions:", jamError);

  // Le compteur de reconnaissance audio ne sert que le jour meme.
  const usageCutoff = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { error: usageError } = await supabaseAdmin
    .from("audio_identification_usage")
    .delete()
    .lt("day", usageCutoff);
  if (usageError) console.error("[practice-reminders] audio usage:", usageError);

  const today = parisDate(now);
  const weekday = parisWeekday(now);
  const isPlanDay = weekday === 4;

  // Abonnes aux notifications, rappels non coupes.
  const subscriptions = await fetchAllRows<{ user_id: string }>((from, to) =>
    supabaseAdmin.from("push_subscriptions").select("user_id").order("id").range(from, to)
  );

  const subscribed = [...new Set(subscriptions.map((s) => s.user_id))];
  if (subscribed.length === 0) {
    return NextResponse.json({ success: true, sent: 0, candidates: 0 });
  }

  const profiles = await fetchAllRows<{ user_id: string }>((from, to) =>
    supabaseAdmin
      .from("profile_private")
      .select("user_id")
      .in("user_id", subscribed)
      .eq("practice_reminders", true)
      .order("user_id")
      .range(from, to)
  );
  const userIds = profiles.map((p) => p.user_id);
  if (userIds.length === 0) {
    return NextResponse.json({ success: true, sent: 0, candidates: 0 });
  }

  const since = new Date(now.getTime() - HISTORY_DAYS * 86_400_000).toISOString();
  const logsSince = new Date(now.getTime() - 8 * 86_400_000).toISOString();

  // Une lecture en erreur leve une exception : le cron echoue plutot que
  // d'envoyer des rappels calcules sur des donnees incompletes.
  const [sessions, learning, logs] = await Promise.all([
    fetchAllRows<PracticeSession>((from, to) =>
      supabaseAdmin
        .from("practice_sessions")
        .select("*")
        .in("user_id", userIds)
        .gte("practiced_at", since)
        .order("id")
        .range(from, to)
    ),
    fetchAllRows<Pick<Song, "id" | "user_id" | "title" | "status" | "updated_at">>((from, to) =>
      supabaseAdmin
        .from("songs")
        .select("id, user_id, title, status, updated_at")
        .in("user_id", userIds)
        .eq("status", "learning")
        .order("id")
        .range(from, to)
    ),
    fetchAllRows<{ user_id: string; type: string; data: { songId?: string } | null; sent_at: string }>((from, to) =>
      supabaseAdmin
        .from("notification_logs")
        .select("user_id, type, data, sent_at")
        .in("user_id", userIds)
        .in("type", REMINDER_TYPES)
        .gte("sent_at", logsSince)
        .order("id")
        .range(from, to)
    ),
  ]);

  // Le dernier passage sur chaque morceau en cours, tous temps confondus :
  // la fenetre de 60 jours ferait passer un morceau joue il y a trois mois
  // pour un morceau jamais joue.
  const lastPlayedBySong = new Map<string, string>();
  if (learning.length > 0) {
    const rows = await fetchAllRows<{ song_id: string | null; practiced_at: string }>((from, to) =>
      supabaseAdmin
        .from("practice_sessions")
        .select("song_id, practiced_at")
        .in("song_id", learning.map((s) => s.id))
        .order("practiced_at", { ascending: false })
        .order("id")
        .range(from, to)
    );
    for (const row of rows) {
      if (row.song_id && !lastPlayedBySong.has(row.song_id)) {
        lastPlayedBySong.set(row.song_id, parisDate(new Date(row.practiced_at)));
      }
    }
  }

  // Le jeudi seulement : le plan de la semaine et de quoi le mesurer.
  const remainingByUser = new Map<string, string[]>();
  if (isPlanDay) {
    const monday = mondayOf(today, weekday);
    const mondayStart = new Date(`${monday}T00:00:00Z`).toISOString();

    const goals = await fetchAllRows<WeeklyGoal & { user_id: string }>((from, to) =>
      supabaseAdmin
        .from("weekly_goals")
        .select("*")
        .in("user_id", userIds)
        .eq("week_start", monday)
        .order("position")
        .order("id")
        .range(from, to)
    );

    if (goals.length > 0) {
      const goalSongIds = [...new Set(goals.map((g) => g.song_id).filter(Boolean))] as string[];
      const [goalSongs, bpmRows, covers] = await Promise.all([
        goalSongIds.length
          ? fetchAllRows<Song>((from, to) =>
              supabaseAdmin.from("songs").select("*").in("id", goalSongIds).order("id").range(from, to)
            )
          : Promise.resolve([] as Song[]),
        goalSongIds.length
          ? fetchAllRows<{ song_id: string; bpm_achieved: number }>((from, to) =>
              supabaseAdmin
                .from("practice_sessions")
                .select("song_id, bpm_achieved")
                .in("song_id", goalSongIds)
                .not("bpm_achieved", "is", null)
                .order("id")
                .range(from, to)
            )
          : Promise.resolve([] as { song_id: string; bpm_achieved: number }[]),
        fetchAllRows<{ user_id: string }>((from, to) =>
          supabaseAdmin
            .from("covers")
            .select("user_id")
            .in("user_id", userIds)
            .gte("created_at", mondayStart)
            .order("id")
            .range(from, to)
        ),
      ]);

      const songs = new Map<string, Song>(goalSongs.map((s) => [s.id, s]));
      const bestBpm = new Map<string, number>();
      for (const row of bpmRows) {
        bestBpm.set(row.song_id, Math.max(bestBpm.get(row.song_id) ?? 0, row.bpm_achieved));
      }
      const coversByUser = groupBy(covers, (c) => c.user_id);

      for (const [userId, userGoals] of groupBy(goals, (g) => g.user_id)) {
        const input: MeasureInput = {
          weekSessions: sessions.filter((s) => s.user_id === userId && s.practiced_at >= mondayStart),
          bestBpm,
          songs,
          weekCovers: coversByUser.get(userId)?.length ?? 0,
        };
        remainingByUser.set(
          userId,
          userGoals.filter((goal) => !isGoalDone(goal, input)).map((goal) => goal.title)
        );
      }
    }
  }

  const sessionsByUser = groupBy(sessions, (s) => s.user_id);
  const songsByUser = groupBy(learning, (s) => s.user_id);
  const logsByUser = groupBy(logs, (l) => l.user_id);

  const practiceDaysByUser = new Map<string, Set<string>>(
    userIds.map((userId) => [
      userId,
      new Set((sessionsByUser.get(userId) ?? []).map((s) => parisDate(new Date(s.practiced_at)))),
    ])
  );

  // Le rappel annonce la longueur de la serie : pour ceux dont la serie est
  // en danger, on lit aussi ce qui precede la fenetre de 60 jours.
  const atRisk = userIds.filter((userId) => isStreakLastChance(practiceDaysByUser.get(userId)!, today));
  if (atRisk.length > 0) {
    const older = await fetchAllRows<{ user_id: string; practiced_at: string }>((from, to) =>
      supabaseAdmin
        .from("practice_sessions")
        .select("user_id, practiced_at")
        .in("user_id", atRisk)
        .lt("practiced_at", since)
        .order("id")
        .range(from, to)
    );
    for (const row of older) {
      practiceDaysByUser.get(row.user_id)?.add(parisDate(new Date(row.practiced_at)));
    }
  }

  let sent = 0;
  const picked: Record<string, number> = {};

  for (const userId of userIds) {
    const input: ReminderInput = {
      today,
      weekday,
      practiceDays: practiceDaysByUser.get(userId) ?? new Set<string>(),
      learningSongs: (songsByUser.get(userId) ?? []).map((song) => ({
        id: song.id,
        title: song.title,
        lastPlayed: lastPlayedBySong.get(song.id) ?? null,
        since: parisDate(new Date(song.updated_at)),
      })),
      remainingGoals: remainingByUser.get(userId) ?? [],
      recent: (logsByUser.get(userId) ?? []).map((log) => ({
        type: log.type,
        date: parisDate(new Date(log.sent_at)),
        songId: log.data?.songId,
      })),
    };

    const reminder = pickReminder(input);
    if (!reminder) continue;

    const result = await sendPushNotification(
      userId,
      (t) => ({
        ...reminder.text(t),
        tag: reminder.type,
        data: { url: reminder.url, ...(reminder.songId ? { songId: reminder.songId } : {}) },
      }),
      reminder.type
    );
    if (result.success > 0) sent++;
    picked[reminder.type] = (picked[reminder.type] ?? 0) + 1;
  }

  return NextResponse.json({
    success: true,
    candidates: userIds.length,
    sent,
    picked,
    timestamp: now.toISOString(),
  });
}
