import { createClient } from "@supabase/supabase-js";
import { INTL_LOCALE, type Locale } from "@/i18n/config";
import { safeTimeZone } from "@/lib/time-zone";
import { sendPushNotificationToMultipleUsers, type NotificationType, type PushT } from "./send-push";

/** « jeudi 3 décembre à 20:00 », a l'heure de la repete et non du serveur. */
export function rehearsalDateLabel(date: string | Date, timeZone: string | null | undefined, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: safeTimeZone(timeZone),
  }).format(new Date(date));
}

/** Sans ceux qui ont coupe les repetes, partout ou dans ce groupe. Lu hors RLS. */
export async function rehearsalRecipients(bandId: string, userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const [{ data: off }, { data: muted }] = await Promise.all([
    db.from("profile_private").select("user_id").in("user_id", userIds).eq("notify_rehearsals", false),
    db.from("band_members").select("user_id").eq("band_id", bandId).in("user_id", userIds).eq("rehearsal_notifications", false),
  ]);
  const silent = new Set([...(off ?? []), ...(muted ?? [])].map((row) => row.user_id as string));
  return userIds.filter((id) => !silent.has(id));
}

type RehearsalEvent = "rehearsalCreated" | "rehearsalMoved" | "rehearsalUpdated" | "rehearsalCancelled" | "rehearsalDeleted" | "rehearsalDeclined";

const TYPES: Record<RehearsalEvent, NotificationType> = {
  rehearsalCreated: "rehearsal_created",
  rehearsalMoved: "rehearsal_moved",
  rehearsalUpdated: "rehearsal_updated",
  rehearsalCancelled: "rehearsal_cancelled",
  rehearsalDeleted: "rehearsal_deleted",
  rehearsalDeclined: "rehearsal_declined",
};

/** Un changement sur une repete, dit a chacun dans sa langue. `count` : repetes concernees. */
export async function notifyRehearsalEvent(
  event: RehearsalEvent,
  userIds: string[],
  rehearsal: { id: string; band_id: string; title: string; date: string; time_zone?: string | null },
  actorName: string | null,
  count = 1
): Promise<void> {
  const recipients = await rehearsalRecipients(rehearsal.band_id, userIds);
  if (recipients.length === 0) return;
  await sendPushNotificationToMultipleUsers(
    recipients.map((userId) => ({
      userId,
      payload: (t: PushT, locale: Locale) => ({
        title: t(`${event}.title`),
        body: t(`${event}.body`, {
          name: actorName ?? t("someone"),
          title: rehearsal.title,
          date: rehearsalDateLabel(rehearsal.date, rehearsal.time_zone, locale),
          count,
        }),
        tag: `${TYPES[event]}-${rehearsal.id}${event === "rehearsalDeclined" ? `-${Date.now()}` : ""}`,
        renotify: true,
        data: {
          url:
            event === "rehearsalDeleted"
              ? `/commu/groupes/${rehearsal.band_id}`
              : `/setlists/rehearsals/${rehearsal.id}`,
        },
      }),
      notificationType: TYPES[event],
    }))
  );
}
