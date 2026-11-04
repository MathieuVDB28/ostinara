import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { liveSessionHref } from "@/lib/live-session";
import { INSTRUMENT_VALUES } from "@/lib/instruments";
import { sendPushNotificationToMultipleUsers } from "./send-push";

/**
 * « Lea joue en ce moment » : ce qui part aux amis une minute apres le
 * lancement d'une session, si elle n'a pas ete annulee entre-temps.
 *
 * Les amis et leurs reglages se lisent hors RLS : profile_private n'est
 * lisible que par son proprietaire.
 */

function admin() {
  return createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type Db = ReturnType<typeof admin>;

/**
 * Le meme tag pour le debut et la fin d'une session : la notification de fin
 * remplace celle du debut au lieu de s'y ajouter.
 */
export function liveSessionTag(userId: string): string {
  return `friend-session:${userId}`;
}

/** Les amis qui n'ont pas coupe « Quand un ami se met a jouer ». */
async function friendsToAlert(db: Db, userId: string): Promise<string[]> {
  const { data: friendships } = await db
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  const friendIds = (friendships ?? []).map((f) =>
    f.requester_id === userId ? (f.addressee_id as string) : (f.requester_id as string)
  );
  if (friendIds.length === 0) return [];

  const { data: optedOut } = await db
    .from("profile_private")
    .select("user_id")
    .in("user_id", friendIds)
    .eq("notify_friends_playing", false);

  const off = new Set((optedOut ?? []).map((row) => row.user_id as string));
  return friendIds.filter((id) => !off.has(id));
}

/** Previent les amis, sauf si la session est deja finie ou deja annoncee. */
export async function announceLiveSession(sessionId: string): Promise<void> {
  const db = admin();

  // On reserve l'annonce avant d'envoyer : elle ne peut partir qu'une fois.
  const { data: session } = await db
    .from("live_sessions")
    .update({ announced_at: new Date().toISOString() })
    .eq("id", sessionId)
    .is("ended_at", null)
    .is("announced_at", null)
    .select("user_id, instrument, song_title, exercise_name")
    .maybeSingle();
  if (!session) return;

  const userId = session.user_id as string;
  const recipients = await friendsToAlert(db, userId);
  if (recipients.length === 0) return;

  const { data: profile } = await db
    .from("profiles")
    .select("username, display_name")
    .eq("id", userId)
    .maybeSingle();
  const name = profile?.display_name || profile?.username || null;

  const songTitle = session.song_title as string | null;
  const exerciseName = session.exercise_name as string | null;
  const instrument = (INSTRUMENT_VALUES as string[]).includes(session.instrument ?? "")
    ? (session.instrument as string)
    : "other";

  await sendPushNotificationToMultipleUsers(
    recipients.map((recipient) => ({
      userId: recipient,
      notificationType: "friend_playing" as const,
      payload: (t) => ({
        title: t("friendPlaying.title", { name: name ?? t("someFriend") }),
        body: t("friendPlaying.body", {
          kind: songTitle ? "song" : exerciseName ? "exercise" : "free",
          title: songTitle ?? exerciseName ?? "",
          instrument,
        }),
        tag: liveSessionTag(userId),
        // Une ancienne notification de cet ami peut trainer sous ce tag :
        // celle-ci doit quand meme sonner.
        renotify: true,
        data: { url: liveSessionHref(sessionId) },
      }),
    }))
  );
}

/**
 * Ceux que la fin de session peut remplacer sans bruit : ils ont eu le debut.
 * L'annonce est consommee : une session suivante, si elle n'est pas annoncee,
 * sonnera normalement.
 */
export async function takeLiveSessionAudience(userId: string): Promise<Set<string>> {
  const db = admin();
  const { data } = await db
    .from("live_sessions")
    .update({ announced_at: null })
    .eq("user_id", userId)
    .not("announced_at", "is", null)
    .select("id")
    .maybeSingle();
  if (!data) return new Set();
  return new Set(await friendsToAlert(db, userId));
}
