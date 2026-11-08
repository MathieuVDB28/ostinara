import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { INTL_LOCALE, type Locale } from "@/i18n/config";
import {
  summarizeSetlistChanges,
  type SetlistChange,
  type SetlistChangeKind,
} from "@/lib/setlist-changes";
import { sendPushNotificationToMultipleUsers, type PushT } from "./send-push";

export type { SetlistChangeKind };

/**
 * Les notifications des setlists de groupe.
 *
 * Creation et suppression partent tout de suite, a tous les membres du
 * groupe sauf l'auteur. Les modifications partent en resume : chaque geste
 * (ajout, retrait, retouche, deplacement, infos) est note dans
 * `setlist_change_log`, puis un minuteur attend que l'auteur ait fini.
 * Si un geste plus recent du meme auteur sur la meme setlist arrive
 * entre-temps, c'est son minuteur a lui qui enverra le resume.
 *
 * Le minuteur tourne dans `after()` : pas de cron, mais une fonction coupee
 * en route laisse des lignes en attente. Le geste suivant, n'importe ou,
 * ramasse celles qui ont plus de STALE_MS.
 *
 * Seuls les membres qui n'ont pas coupe ces notifications pour le groupe
 * (`band_members.setlist_notifications`) les recoivent. Exception : quand la
 * setlist est celle de la prochaine repete, ceux qui y vont (pas « decline »)
 * recoivent le resume quand meme, dans une version qui nomme la repete.
 */

/** Le calme qu'on attend avant d'envoyer le resume d'une modification. */
const DEBOUNCE_MS = 90_000;
/** Au-dela, une ligne en attente a perdu son minuteur. */
const STALE_MS = 10 * 60_000;

/** La setlist, le groupe et les membres se lisent hors RLS : les gestes viennent d'actions deja autorisees. */
function admin() {
  return createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type Db = ReturnType<typeof admin>;

async function displayName(db: Db, userId: string): Promise<string | null> {
  const { data } = await db
    .from("profiles")
    .select("username, display_name")
    .eq("id", userId)
    .maybeSingle();
  return data?.display_name || data?.username || null;
}

async function bandName(db: Db, bandId: string): Promise<string> {
  const { data } = await db.from("bands").select("name").eq("id", bandId).maybeSingle();
  return data?.name ?? "";
}

/** Les membres a prevenir : tous sauf l'auteur, et sauf ceux qui ont coupe. */
async function recipients(db: Db, bandId: string, authorId: string): Promise<string[]> {
  const { data } = await db
    .from("band_members")
    .select("user_id")
    .eq("band_id", bandId)
    .eq("setlist_notifications", true)
    .neq("user_id", authorId);
  return (data ?? []).map((row) => row.user_id as string);
}

// === Creation ===

export function notifyBandSetlistCreated(input: {
  setlistId: string;
  bandId: string;
  authorId: string;
  setlistName: string;
}) {
  after(async () => {
    try {
      const db = admin();
      const ids = await recipients(db, input.bandId, input.authorId);
      if (ids.length === 0) return;
      const [author, band] = await Promise.all([
        displayName(db, input.authorId),
        bandName(db, input.bandId),
      ]);

      await sendPushNotificationToMultipleUsers(
        ids.map((userId) => ({
          userId,
          notificationType: "band_setlist_created",
          payload: (t: PushT) => ({
            title: t("bandSetlistCreated.title", { band }),
            body: t("bandSetlistCreated.body", {
              name: author ?? t("someone"),
              setlist: input.setlistName,
            }),
            tag: `band-setlist-${input.setlistId}`,
            data: { url: `/setlists/${input.setlistId}` },
          }),
        }))
      );
    } catch (error) {
      console.error("Error notifying band of new setlist:", error);
    }
  });
}

// === Concert ===

/**
 * Une date posee sur une setlist de groupe : « nouveau concert », a la place
 * de l'annonce de creation quand la setlist nait avec sa date.
 */
export function notifyBandConcert(input: {
  setlistId: string;
  bandId: string;
  authorId: string;
  setlistName: string;
  concertDate: string;
  concertTime?: string | null;
  venue?: string | null;
  city?: string | null;
}) {
  after(async () => {
    try {
      const db = admin();
      const ids = await recipients(db, input.bandId, input.authorId);
      if (ids.length === 0) return;
      const [author, band] = await Promise.all([
        displayName(db, input.authorId),
        bandName(db, input.bandId),
      ]);
      const [y, m, d] = input.concertDate.split("-").map(Number);
      const day = new Date(Date.UTC(y, m - 1, d));
      const place = [input.venue, input.city].filter(Boolean).join(", ");

      await sendPushNotificationToMultipleUsers(
        ids.map((userId) => ({
          userId,
          notificationType: "band_concert",
          payload: (t: PushT, locale: Locale) => {
            const date = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
              timeZone: "UTC",
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(day);
            const when = input.concertTime ? `${date}, ${input.concertTime.slice(0, 5)}` : date;
            return {
              title: t("bandConcert.title", { band }),
              body: place
                ? t("bandConcert.bodyPlace", { name: author ?? t("someone"), when, place })
                : t("bandConcert.body", { name: author ?? t("someone"), when, setlist: input.setlistName }),
              tag: `band-setlist-${input.setlistId}`,
              data: { url: `/setlists/${input.setlistId}` },
            };
          },
        }))
      );
    } catch (error) {
      console.error("Error notifying band of new concert:", error);
    }
  });
}

// === Suppression ===

export function notifyBandSetlistDeleted(input: {
  bandId: string;
  authorId: string;
  setlistName: string;
}) {
  after(async () => {
    try {
      const db = admin();
      const ids = await recipients(db, input.bandId, input.authorId);
      if (ids.length === 0) return;
      const [author, band] = await Promise.all([
        displayName(db, input.authorId),
        bandName(db, input.bandId),
      ]);

      await sendPushNotificationToMultipleUsers(
        ids.map((userId) => ({
          userId,
          notificationType: "band_setlist_deleted",
          payload: (t: PushT) => ({
            title: t("bandSetlistDeleted.title", { band }),
            body: t("bandSetlistDeleted.body", {
              name: author ?? t("someone"),
              setlist: input.setlistName,
            }),
            data: { url: `/commu/groupes/${input.bandId}` },
          }),
        }))
      );
    } catch (error) {
      console.error("Error notifying band of deleted setlist:", error);
    }
  });
}

// === Modifications, en resume ===

/**
 * Note un geste sur une setlist. Rien ne se passe pour une setlist
 * personnelle. Appeler apres que le geste a reussi.
 */
export function recordSetlistChange(input: {
  setlistId: string;
  authorId: string;
  kind: SetlistChangeKind;
  itemLabel?: string | null;
}) {
  after(async () => {
    try {
      const db = admin();
      const { data: setlist } = await db
        .from("setlists")
        .select("band_id")
        .eq("id", input.setlistId)
        .maybeSingle();
      if (!setlist?.band_id) return;

      const { data: row, error } = await db
        .from("setlist_change_log")
        .insert({
          setlist_id: input.setlistId,
          band_id: setlist.band_id,
          user_id: input.authorId,
          kind: input.kind,
          item_label: input.itemLabel?.trim() || null,
        })
        .select("created_at")
        .single();

      if (error || !row) {
        console.error("Error logging setlist change:", error);
        return;
      }

      // Les oublies d'un minuteur coupe, pendant qu'on attend le notre.
      await flushStaleChanges(db);

      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS));

      // Un geste plus recent ? Son minuteur enverra le resume.
      const { count } = await db
        .from("setlist_change_log")
        .select("id", { count: "exact", head: true })
        .eq("setlist_id", input.setlistId)
        .eq("user_id", input.authorId)
        .is("notified_at", null)
        .gt("created_at", row.created_at);
      if ((count ?? 0) > 0) return;

      await flushChanges(db, input.setlistId, input.authorId);
    } catch (error) {
      console.error("Error handling setlist change:", error);
    }
  });
}

/** Envoie le resume des gestes en attente d'un auteur sur une setlist. */
async function flushChanges(db: Db, setlistId: string, authorId: string) {
  // On reserve les lignes avant d'envoyer : deux minuteurs ne resument pas
  // deux fois le meme geste.
  const { data: claimed } = await db
    .from("setlist_change_log")
    .update({ notified_at: new Date().toISOString() })
    .eq("setlist_id", setlistId)
    .eq("user_id", authorId)
    .is("notified_at", null)
    .select("band_id, kind, item_label");

  if (!claimed || claimed.length === 0) return;

  const bandId = claimed[0].band_id as string;
  const changes = claimed as unknown as SetlistChange[];

  const [members, rehearsal] = await Promise.all([
    recipients(db, bandId, authorId),
    nextRehearsal(db, setlistId, authorId),
  ]);
  // Ceux qui vont a la repete l'apprennent meme s'ils ont coupe le reste.
  const ids = new Set([...members, ...(rehearsal?.participantIds ?? [])]);
  if (ids.size === 0) return;

  const [{ data: setlist }, author, band] = await Promise.all([
    db.from("setlists").select("name").eq("id", setlistId).maybeSingle(),
    displayName(db, authorId),
    bandName(db, bandId),
  ]);
  // Supprimee entre-temps : la suppression a deja ete annoncee.
  if (!setlist) return;

  const summary = async (locale: Locale) => {
    const tc = await getTranslations({ locale, namespace: "setlists.changes" });
    return summarizeSetlistChanges(changes, (key, values) => tc(key, values), INTL_LOCALE[locale]);
  };

  await sendPushNotificationToMultipleUsers(
    [...ids].map((userId) => {
      const goesToRehearsal = rehearsal?.participantIds.includes(userId) ?? false;
      return {
        userId,
        notificationType: "band_setlist_updated" as const,
        payload: async (t: PushT, locale: Locale) => {
          const name = author ?? t("someone");
          const changesText = await summary(locale);
          const text =
            goesToRehearsal && rehearsal
              ? {
                  title: t("bandSetlistRehearsalUpdated.title", { band }),
                  body: t("bandSetlistRehearsalUpdated.body", {
                    name,
                    setlist: setlist.name,
                    date: new Intl.DateTimeFormat(INTL_LOCALE[locale], {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    }).format(new Date(rehearsal.date)),
                    changes: changesText,
                  }),
                }
              : {
                  title: t("bandSetlistUpdated.title", { band }),
                  body: t("bandSetlistUpdated.body", { name, setlist: setlist.name, changes: changesText }),
                };
          return { ...text, tag: `band-setlist-${setlistId}`, data: { url: `/setlists/${setlistId}` } };
        },
      };
    })
  );
}

/**
 * La prochaine repete qui joue cette setlist, et ceux qui y vont : tous les
 * participants sauf ceux qui ont decline, et sauf l'auteur du changement.
 */
async function nextRehearsal(
  db: Db,
  setlistId: string,
  authorId: string
): Promise<{ date: string; participantIds: string[] } | null> {
  const { data: rehearsal } = await db
    .from("rehearsals")
    .select("id, date")
    .eq("setlist_id", setlistId)
    .eq("status", "scheduled")
    .gte("date", new Date().toISOString())
    .order("date", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!rehearsal) return null;

  const { data: participants } = await db
    .from("rehearsal_participants")
    .select("user_id")
    .eq("rehearsal_id", rehearsal.id)
    .neq("status", "declined")
    .neq("user_id", authorId);

  return {
    date: rehearsal.date as string,
    participantIds: (participants ?? []).map((row) => row.user_id as string),
  };
}

/** Les resumes restes en plan (minuteur coupe). */
async function flushStaleChanges(db: Db) {
  const now = Date.now();

  const { data: stale } = await db
    .from("setlist_change_log")
    .select("setlist_id, user_id")
    .is("notified_at", null)
    .lt("created_at", new Date(now - STALE_MS).toISOString())
    .limit(50);

  const pairs = new Map<string, { setlistId: string; authorId: string }>();
  for (const row of stale ?? []) {
    pairs.set(`${row.setlist_id}:${row.user_id}`, {
      setlistId: row.setlist_id as string,
      authorId: row.user_id as string,
    });
  }
  for (const { setlistId, authorId } of pairs.values()) {
    await flushChanges(db, setlistId, authorId);
  }
}
