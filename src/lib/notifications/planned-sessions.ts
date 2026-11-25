import { createClient } from "@supabase/supabase-js";
import type { Locale } from "@/i18n/config";
import { rehearsalDateLabel } from "./rehearsals";
import { sendPushNotification, type NotificationType, type PushT } from "./send-push";

type PlannedEvent = "plannedInvited" | "plannedAccepted" | "plannedDeclined" | "plannedMoved" | "plannedCancelled";

const TYPES: Record<PlannedEvent, NotificationType> = {
  plannedInvited: "planned_invited",
  plannedAccepted: "planned_answered",
  plannedDeclined: "planned_answered",
  plannedMoved: "planned_moved",
  plannedCancelled: "planned_cancelled",
};

/** Un mot a l'autre personne d'une session planifiee, a son heure a elle. */
export async function notifyPlannedEvent(
  event: PlannedEvent,
  userId: string,
  session: { id: string; title: string; starts_at: string; time_zone: string },
  actorName: string | null,
  count = 1
): Promise<void> {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: prefs } = await db.from("profile_private").select("notify_planned").eq("user_id", userId).maybeSingle();
  if (prefs?.notify_planned === false) return;

  await sendPushNotification(
    userId,
    (t: PushT, locale: Locale) => ({
      title: t(`${event}.title`),
      body: t(`${event}.body`, {
        name: actorName ?? t("someone"),
        title: session.title,
        date: rehearsalDateLabel(session.starts_at, session.time_zone, locale),
        count,
      }),
      tag: `planned-${session.id}`,
      renotify: true,
      data: { url: event === "plannedCancelled" ? "/jouer" : `/jouer?planned=${session.id}` },
    }),
    TYPES[event]
  );
}
