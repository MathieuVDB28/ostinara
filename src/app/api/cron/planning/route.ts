import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { INTL_LOCALE, type Locale } from "@/i18n/config";
import { rehearsalDateLabel, rehearsalRecipients } from "@/lib/notifications/rehearsals";
import {
  sendPushNotification,
  type NotificationPayload,
  type NotificationType,
  type PushT,
} from "@/lib/notifications/send-push";
import { safeTimeZone } from "@/lib/time-zone";
import type { Rehearsal } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

interface Outgoing {
  userId: string;
  type: NotificationType;
  payload: (t: PushT, locale: Locale) => NotificationPayload;
}

function clock(date: string, timeZone: string | undefined, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: safeTimeZone(timeZone),
  }).format(new Date(date));
}

interface PlannedReminderRow {
  session_id: string;
  user_id: string;
  title: string;
  starts_at: string;
  time_zone: string;
  remind_minutes: number;
}

async function plannedReminders(): Promise<Outgoing[]> {
  const { data, error } = await db.rpc("claim_planned_reminders");
  if (error) throw error;
  return (data as PlannedReminderRow[]).map((row) => ({
    userId: row.user_id,
    type: "planned_reminder",
    payload: (t, locale) => ({
      title: t(
        row.remind_minutes === 0
          ? "plannedReminder.now"
          : row.remind_minutes === 1440
            ? "plannedReminder.tomorrow"
            : "plannedReminder.soon"
      ),
      body: t("plannedReminder.body", { title: row.title, time: clock(row.starts_at, row.time_zone, locale) }),
      tag: `planned-${row.session_id}`,
      renotify: true,
      data: { url: `/jouer?planned=${row.session_id}` },
    }),
  }));
}

async function plannedNudges(): Promise<Outgoing[]> {
  const { data, error } = await db.rpc("claim_planned_nudges");
  if (error) throw error;
  return (data as { session_id: string; user_id: string; title: string }[]).map((row) => ({
    userId: row.user_id,
    type: "planned_missed",
    payload: (t) => ({
      title: t("plannedMissed.title"),
      body: t("plannedMissed.body", { title: row.title }),
      tag: `planned-${row.session_id}`,
      renotify: true,
      data: { url: `/jouer?planned=${row.session_id}` },
    }),
  }));
}

const REHEARSAL_KINDS = {
  soon: { type: "rehearsal_soon", key: "rehearsalSoon" },
  unanswered: { type: "rehearsal_unanswered", key: "rehearsalUnanswered" },
  log: { type: "rehearsal_log_reminder", key: "rehearsalLogReminder" },
} as const;

async function rehearsalReminders(kind: keyof typeof REHEARSAL_KINDS): Promise<Outgoing[]> {
  const { data, error } = await db.rpc("claim_rehearsal_reminders", { p_kind: kind });
  if (error) throw error;
  const rehearsals = data as Rehearsal[];
  if (rehearsals.length === 0) return [];

  const { data: people, error: peopleError } = await db
    .from("rehearsal_participants")
    .select("rehearsal_id, user_id, status")
    .in("rehearsal_id", rehearsals.map((r) => r.id));
  if (peopleError) throw peopleError;

  const { type, key } = REHEARSAL_KINDS[kind];
  const outgoing: Outgoing[] = [];
  for (const rehearsal of rehearsals) {
    const concerned =
      kind === "log"
        ? [rehearsal.created_by]
        : (people ?? [])
            .filter((p) => p.rehearsal_id === rehearsal.id)
            .filter((p) => (kind === "soon" ? p.status !== "declined" : p.status === "invited"))
            .map((p) => p.user_id as string);

    for (const userId of await rehearsalRecipients(rehearsal.band_id, concerned)) {
      outgoing.push({
        userId,
        type,
        payload: (t, locale) => ({
          title: t(`${key}.title`),
          body: t(`${key}.body`, {
            title: rehearsal.title,
            time: clock(rehearsal.date, rehearsal.time_zone, locale),
            date: rehearsalDateLabel(rehearsal.date, rehearsal.time_zone, locale),
            location: rehearsal.location || "none",
          }),
          tag: `${type}-${rehearsal.id}`,
          data: {
            url:
              kind === "log"
                ? `/commu/groupes/${rehearsal.band_id}/raconter?repete=${rehearsal.id}`
                : `/setlists/rehearsals/${rehearsal.id}`,
          },
        }),
      });
    }
  }
  return outgoing;
}

/**
 * Appelee toutes les 5 minutes par Supabase Cron (migration
 * 20261204_planned_sessions). Les claim_* reservent ce qu'ils rendent : deux
 * appels qui se croisent n'envoient rien en double.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Une famille en erreur n'empeche pas les autres.
  const families = await Promise.allSettled([
    plannedReminders(),
    plannedNudges(),
    rehearsalReminders("soon"),
    rehearsalReminders("unanswered"),
    rehearsalReminders("log"),
  ]);
  let errors = 0;
  const outgoing = families.flatMap((family) => {
    if (family.status === "fulfilled") return family.value;
    console.error("[planning] claim:", family.reason);
    errors++;
    return [];
  });

  let sent = 0;
  for (let i = 0; i < outgoing.length; i += 20) {
    const results = await Promise.all(
      outgoing.slice(i, i + 20).map(({ userId, payload, type }) => sendPushNotification(userId, payload, type))
    );
    sent += results.filter((result) => result.success > 0).length;
  }

  return NextResponse.json(
    { success: errors === 0, claimed: outgoing.length, sent, errors },
    { status: errors ? 500 : 200 }
  );
}
