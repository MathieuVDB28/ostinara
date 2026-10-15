import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushNotification } from "@/lib/notifications";
import {
  REMINDER_TYPES,
  pickReminder,
  type ReminderInput,
} from "@/lib/notifications/practice-reminders";
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
  const today = parisDate(now);
  const weekday = parisWeekday(now);
  const isPlanDay = weekday === 4;

  // Abonnes aux notifications, rappels non coupes.
  const { data: subscriptions, error: subError } = await supabaseAdmin
    .from("push_subscriptions")
    .select("user_id");
  if (subError) {
    console.error("[practice-reminders] subscriptions:", subError);
    return NextResponse.json({ error: "subscriptions" }, { status: 500 });
  }

  const subscribed = [...new Set((subscriptions ?? []).map((s) => s.user_id as string))];
  if (subscribed.length === 0) {
    return NextResponse.json({ success: true, sent: 0, candidates: 0 });
  }

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .in("id", subscribed)
    .eq("practice_reminders", true);
  const userIds = (profiles ?? []).map((p) => p.id as string);
  if (userIds.length === 0) {
    return NextResponse.json({ success: true, sent: 0, candidates: 0 });
  }

  const since = new Date(now.getTime() - HISTORY_DAYS * 86_400_000).toISOString();
  const logsSince = new Date(now.getTime() - 8 * 86_400_000).toISOString();

  const [sessionsResult, songsResult, logsResult] = await Promise.all([
    supabaseAdmin
      .from("practice_sessions")
      .select("*")
      .in("user_id", userIds)
      .gte("practiced_at", since),
    supabaseAdmin
      .from("songs")
      .select("id, user_id, title, status, updated_at")
      .in("user_id", userIds)
      .eq("status", "learning"),
    supabaseAdmin
      .from("notification_logs")
      .select("user_id, type, data, sent_at")
      .in("user_id", userIds)
      .in("type", REMINDER_TYPES)
      .gte("sent_at", logsSince),
  ]);

  const sessions = (sessionsResult.data ?? []) as PracticeSession[];
  const learning = (songsResult.data ?? []) as Pick<Song, "id" | "user_id" | "title" | "status" | "updated_at">[];

  // Le dernier passage sur chaque morceau en cours, tous temps confondus :
  // la fenetre de 60 jours ferait passer un morceau joue il y a trois mois
  // pour un morceau jamais joue.
  const lastPlayedBySong = new Map<string, string>();
  if (learning.length > 0) {
    const { data } = await supabaseAdmin
      .from("practice_sessions")
      .select("song_id, practiced_at")
      .in("song_id", learning.map((s) => s.id))
      .order("practiced_at", { ascending: false });
    for (const row of data ?? []) {
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

    const { data: goalsData } = await supabaseAdmin
      .from("weekly_goals")
      .select("*")
      .in("user_id", userIds)
      .eq("week_start", monday)
      .order("position");
    const goals = (goalsData ?? []) as (WeeklyGoal & { user_id: string })[];

    if (goals.length > 0) {
      const goalSongIds = [...new Set(goals.map((g) => g.song_id).filter(Boolean))] as string[];
      const [goalSongs, bpmRows, covers] = await Promise.all([
        goalSongIds.length
          ? supabaseAdmin.from("songs").select("*").in("id", goalSongIds)
          : Promise.resolve({ data: [] }),
        goalSongIds.length
          ? supabaseAdmin
              .from("practice_sessions")
              .select("song_id, bpm_achieved")
              .in("song_id", goalSongIds)
              .not("bpm_achieved", "is", null)
          : Promise.resolve({ data: [] }),
        supabaseAdmin.from("covers").select("user_id").in("user_id", userIds).gte("created_at", mondayStart),
      ]);

      const songs = new Map<string, Song>(((goalSongs.data ?? []) as Song[]).map((s) => [s.id, s]));
      const bestBpm = new Map<string, number>();
      for (const row of (bpmRows.data ?? []) as { song_id: string; bpm_achieved: number }[]) {
        bestBpm.set(row.song_id, Math.max(bestBpm.get(row.song_id) ?? 0, row.bpm_achieved));
      }
      const coversByUser = groupBy((covers.data ?? []) as { user_id: string }[], (c) => c.user_id);

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
  const logsByUser = groupBy(
    (logsResult.data ?? []) as { user_id: string; type: string; data: { songId?: string } | null; sent_at: string }[],
    (l) => l.user_id
  );

  let sent = 0;
  const picked: Record<string, number> = {};

  for (const userId of userIds) {
    const input: ReminderInput = {
      today,
      weekday,
      practiceDays: new Set((sessionsByUser.get(userId) ?? []).map((s) => parisDate(new Date(s.practiced_at)))),
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
      {
        title: reminder.title,
        body: reminder.body,
        tag: reminder.type,
        data: { url: reminder.url, ...(reminder.songId ? { songId: reminder.songId } : {}) },
      },
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
