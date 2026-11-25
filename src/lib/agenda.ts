import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_TIME_ZONE, fromWallTime, safeTimeZone, shiftWallDays, toWallTime } from "@/lib/time-zone";

/** Sessions planifiees, repetes et concerts, dans un seul agenda. */
export interface AgendaEvent {
  key: string;
  kind: "planned" | "rehearsal" | "concert";
  title: string;
  /** Le groupe, ou la personne avec qui je joue. */
  withName: string | null;
  starts_at: string;
  ends_at: string;
  /** Un concert sans heure : toute la journee (`day`, AAAA-MM-JJ). */
  day: string | null;
  location: string | null;
  href: string;
  done: boolean;
}

const HOUR = 3_600_000;

/** Un concert s'ecrit a l'heure de Paris, date et heure separees. */
function concertTimes(date: string, time: string | null): { start: Date; end: Date } {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time ? time.split(":").map(Number) : [0, 0];
  const wall = { year, month, day, hour, minute };
  const start = fromWallTime(wall, DEFAULT_TIME_ZONE);
  const end = time ? new Date(start.getTime() + 2 * HOUR) : fromWallTime(shiftWallDays(wall, 1), DEFAULT_TIME_ZONE);
  return { start, end };
}

/**
 * Tout est filtre sur `userId` : l'abonnement lit avec le service role, sans
 * RLS. Une erreur est levee plutot que de rendre un agenda incomplet.
 */
export async function loadAgenda(db: SupabaseClient, userId: string, from: Date, to: Date): Promise<AgendaEvent[]> {
  const { data: memberships, error: bandsError } = await db.from("band_members").select("band_id").eq("user_id", userId);
  if (bandsError) throw bandsError;
  const bandIds = (memberships ?? []).map((m) => m.band_id as string);
  const none = Promise.resolve({ data: [], error: null });

  const [planned, rehearsals, concerts] = await Promise.all([
    db
      .from("planned_sessions")
      .select(
        "id, title, starts_at, duration_minutes, location, mine:planned_session_people!inner(user_id, rsvp, state), people:planned_session_people(user_id, rsvp, profile:profiles(username, display_name))"
      )
      .eq("mine.user_id", userId)
      .eq("mine.rsvp", "accepted")
      .neq("mine.state", "skipped")
      .gte("starts_at", from.toISOString())
      .lte("starts_at", to.toISOString())
      .order("starts_at")
      .limit(500),
    bandIds.length
      ? db
          .from("rehearsals")
          .select("id, title, date, end_date, location, status, band:bands(name), mine:rehearsal_participants!inner(user_id, status)")
          .in("band_id", bandIds)
          .neq("status", "cancelled")
          .eq("mine.user_id", userId)
          .neq("mine.status", "declined")
          .gte("date", from.toISOString())
          .lte("date", to.toISOString())
          .order("date")
          .limit(500)
      : none,
    bandIds.length
      ? db
          .from("setlists")
          .select("id, name, concert_date, concert_time, venue, city, band:bands(name)")
          .in("band_id", bandIds)
          .gte("concert_date", from.toISOString().slice(0, 10))
          .lte("concert_date", to.toISOString().slice(0, 10))
          .order("concert_date")
          .limit(200)
      : none,
  ]);
  const error = planned.error ?? rehearsals.error ?? concerts.error;
  if (error) throw error;

  type Band = { name: string } | null;
  const events: AgendaEvent[] = [];

  for (const row of (planned.data ?? []) as unknown as {
    id: string; title: string; starts_at: string; duration_minutes: number; location: string | null;
    mine: { state: string }[];
    people: { user_id: string; rsvp: string; profile: { username: string; display_name: string | null } | null }[];
  }[]) {
    const other = row.people.find((p) => p.user_id !== userId && p.rsvp === "accepted")?.profile;
    events.push({
      key: `planned-${row.id}`,
      kind: "planned",
      title: row.title,
      withName: other ? other.display_name || other.username : null,
      starts_at: row.starts_at,
      ends_at: new Date(new Date(row.starts_at).getTime() + row.duration_minutes * 60_000).toISOString(),
      day: null,
      location: row.location,
      href: `/jouer?planned=${row.id}`,
      done: row.mine[0]?.state === "done",
    });
  }

  for (const row of (rehearsals.data ?? []) as unknown as {
    id: string; title: string; date: string; end_date: string | null; location: string | null; status: string; band: Band;
  }[]) {
    events.push({
      key: `rehearsal-${row.id}`,
      kind: "rehearsal",
      title: row.title,
      withName: row.band?.name ?? null,
      starts_at: row.date,
      ends_at: row.end_date ?? new Date(new Date(row.date).getTime() + 2 * HOUR).toISOString(),
      day: null,
      location: row.location,
      href: `/setlists/rehearsals/${row.id}`,
      done: row.status === "completed",
    });
  }

  for (const row of (concerts.data ?? []) as unknown as {
    id: string; name: string; concert_date: string; concert_time: string | null; venue: string | null; city: string | null; band: Band;
  }[]) {
    const { start, end } = concertTimes(row.concert_date, row.concert_time);
    events.push({
      key: `concert-${row.id}`,
      kind: "concert",
      title: row.name,
      withName: row.band?.name ?? null,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      day: row.concert_time ? null : row.concert_date,
      location: [row.venue, row.city].filter(Boolean).join(", ") || null,
      href: `/setlists/${row.id}`,
      done: false,
    });
  }

  return events.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
}

/** Les repetes et concerts qui tombent sur l'un de ces creneaux (pas les jours entiers). */
export function findConflicts(events: AgendaEvent[], starts: Date[], durationMinutes: number): AgendaEvent[] {
  return events.filter(
    (event) =>
      event.kind !== "planned" &&
      !event.day &&
      starts.some(
        (start) =>
          start.getTime() < new Date(event.ends_at).getTime() &&
          start.getTime() + durationMinutes * 60_000 > new Date(event.starts_at).getTime()
      )
  );
}

/** Le jour d'un evenement, AAAA-MM-JJ, dans ce fuseau. */
export function eventDay(event: AgendaEvent, timeZone: string): string {
  if (event.day) return event.day;
  const { year, month, day } = toWallTime(new Date(event.starts_at), safeTimeZone(timeZone));
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
