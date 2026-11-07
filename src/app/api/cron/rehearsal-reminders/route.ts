import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushNotificationToMultipleUsers, type PushT } from "@/lib/notifications";
import { INTL_LOCALE, type Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

// Supabase admin client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify cron secret to prevent unauthorized calls
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // Allow in dev if no secret set
  return authHeader === `Bearer ${cronSecret}`;
}

async function sendReminders(
  rehearsals: Array<{
    id: string;
    title: string;
    date: string;
    location: string | null;
    band: unknown;
    participants: unknown;
  }>,
  type: "rehearsal_reminder" | "rehearsal_today",
  titleKey: "rehearsalToday" | "rehearsalTomorrow"
): Promise<{ sent: number; errors: number }> {
  let sent = 0;
  let errors = 0;

  for (const rehearsal of rehearsals) {
    const participants = (
      rehearsal.participants as { user_id: string; status: string }[]
    ).filter((p) => p.status !== "declined");

    if (participants.length === 0) continue;

    const bandName = (rehearsal.band as unknown as { name: string })?.name || null;
    const dateObj = new Date(rehearsal.date);

    try {
      await sendPushNotificationToMultipleUsers(
        participants.map((p) => ({
          userId: p.user_id,
          payload: (t: PushT, locale: Locale) => ({
            title: t(titleKey),
            body: t("rehearsalReminderBody", {
              title: rehearsal.title,
              band: bandName ?? t("yourBand"),
              time: dateObj.toLocaleTimeString(INTL_LOCALE[locale], { hour: "2-digit", minute: "2-digit" }),
              location: rehearsal.location || "none",
            }),
            data: { url: `/setlists/rehearsals/${rehearsal.id}` },
          }),
          notificationType: type,
        }))
      );
      sent += participants.length;
    } catch (err) {
      console.error(`Error sending ${type}:`, err);
      errors++;
    }
  }

  return { sent, errors };
}

/**
 * Sondages de dates : une seule relance, 48 h apres, a ceux qui n'ont repondu
 * a aucun creneau. Un sondage dont tous les creneaux sont passes ne relance pas.
 */
async function sendPollReminders(now: Date): Promise<{ sent: number; errors: number }> {
  const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const { data: polls, error } = await supabaseAdmin
    .from("rehearsal_polls")
    .select("id, band_id, title, created_by, band:bands(name), options:rehearsal_poll_options!rehearsal_poll_options_poll_id_fkey(starts_at, votes:rehearsal_poll_votes(user_id))")
    .eq("status", "open")
    .is("reminded_at", null)
    .lte("created_at", cutoff);

  if (error) {
    console.error("Error fetching polls to remind:", error);
    return { sent: 0, errors: 1 };
  }

  let sent = 0;
  let errors = 0;
  for (const poll of polls ?? []) {
    const options = poll.options as unknown as { starts_at: string; votes: { user_id: string }[] }[];
    const stillOpen = options.some((option) => new Date(option.starts_at) > now);

    if (stillOpen) {
      const { data: members } = await supabaseAdmin
        .from("band_members")
        .select("user_id")
        .eq("band_id", poll.band_id);
      const answered = new Set(options.flatMap((option) => option.votes.map((vote) => vote.user_id)));
      const waiting = (members ?? [])
        .map((member) => member.user_id as string)
        .filter((id) => id !== poll.created_by && !answered.has(id));
      const bandName = (poll.band as unknown as { name: string } | null)?.name ?? null;

      if (waiting.length > 0) {
        try {
          await sendPushNotificationToMultipleUsers(
            waiting.map((userId) => ({
              userId,
              payload: (t: PushT) => ({
                title: t("rehearsalPollReminder.title", { band: bandName ?? t("yourBand") }),
                body: t("rehearsalPollReminder.body", { title: poll.title }),
                data: { url: `/commu/groupes/${poll.band_id}#poll-${poll.id}` },
              }),
              notificationType: "rehearsal_poll_reminder",
            }))
          );
          sent += waiting.length;
        } catch (err) {
          console.error("Error sending poll reminders:", err);
          errors++;
          continue;
        }
      }
    }

    await supabaseAdmin.from("rehearsal_polls").update({ reminded_at: now.toISOString() }).eq("id", poll.id);
  }

  return { sent, errors };
}

// Runs once daily at ~9h UTC. Sends both "today" and "tomorrow" reminders.
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = { reminders: 0, today: 0, polls: 0, errors: 0 };

  // === Today's rehearsals (anything today that hasn't passed yet) ===
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const { data: todayRehearsals } = await supabaseAdmin
    .from("rehearsals")
    .select(
      `
      id, title, date, location,
      band:bands(name),
      participants:rehearsal_participants(user_id, status)
    `
    )
    .eq("status", "scheduled")
    .gte("date", now.toISOString())
    .lte("date", todayEnd.toISOString());

  if (todayRehearsals && todayRehearsals.length > 0) {
    const r = await sendReminders(
      todayRehearsals,
      "rehearsal_today",
      "rehearsalToday"
    );
    results.today = r.sent;
    results.errors += r.errors;
  }

  // === Tomorrow's rehearsals ===
  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const { data: tomorrowRehearsals } = await supabaseAdmin
    .from("rehearsals")
    .select(
      `
      id, title, date, location,
      band:bands(name),
      participants:rehearsal_participants(user_id, status)
    `
    )
    .eq("status", "scheduled")
    .gte("date", tomorrowStart.toISOString())
    .lte("date", tomorrowEnd.toISOString());

  if (tomorrowRehearsals && tomorrowRehearsals.length > 0) {
    const r = await sendReminders(
      tomorrowRehearsals,
      "rehearsal_reminder",
      "rehearsalTomorrow"
    );
    results.reminders = r.sent;
    results.errors += r.errors;
  }

  const pollResults = await sendPollReminders(now);
  results.polls = pollResults.sent;
  results.errors += pollResults.errors;

  return NextResponse.json({
    success: true,
    ...results,
    timestamp: now.toISOString(),
  });
}
