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

// Runs once daily at ~9h UTC. Sends both "today" and "tomorrow" reminders.
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = { reminders: 0, today: 0, errors: 0 };

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

  return NextResponse.json({
    success: true,
    ...results,
    timestamp: now.toISOString(),
  });
}
