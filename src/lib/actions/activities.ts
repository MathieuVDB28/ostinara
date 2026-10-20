"use server";

import { PUBLIC_PROFILE_COLUMNS } from "@/lib/public-profile";
import { tErr } from "@/i18n/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { INSTRUMENT_VALUES } from "@/lib/instruments";
import { INTL_LOCALE, type Locale } from "@/i18n/config";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { getLibraryMatches } from "@/lib/actions/songs";
import { sendPushNotification, sendPushNotificationToMultipleUsers } from "@/lib/notifications";
import type { LocalizedPayload, NotificationType, PushT } from "@/lib/notifications";
import type {
  ActivityWithDetails,
  ActivityCommentWithProfile,
  ReactionSummary,
  CreateActivityInput,
  Song,
  CoverWithSong,
  Profile,
  WishlistSong,
  AlbumReview,
  AlbumWishlistItem,
} from "@/types";
import { COVER_GEAR_SELECT, withCoverGear } from "@/lib/cover-gear";

/** « 4,5/5 ★ » : la note est stockee sur 10, une unite par demi-etoile. */
function formatStars(rating: unknown, intlLocale: string): string {
  const value = Number(rating);
  if (!Number.isFinite(value)) return "";
  return `${(value / 2).toLocaleString(intlLocale, { maximumFractionDigits: 1 })}/5 ★`;
}

/** Au-dela, une session enregistree est une session « ajoutee », pas « terminee ». */
const SESSION_PAST_AFTER_MS = 3 * 60 * 60 * 1000;

/** L'instrument d'une activite, pour le `select` ICU des messages push. */
function instrumentArg(value: unknown): string {
  return typeof value === "string" && (INSTRUMENT_VALUES as string[]).includes(value) ? value : "other";
}

/**
 * Mapper les types d'activités vers les types de notifications.
 *
 * Le payload est fabrique dans la langue de chaque ami (sendPushNotification
 * appelle le builder avec son t()). Le nom de l'auteur aussi : « Un ami »
 * se traduit.
 */
function getNotificationForActivity(
  type: CreateActivityInput["type"],
  userName: string | null,
  metadata?: Record<string, unknown>
): { payload: LocalizedPayload; notificationType: NotificationType } | null {
  const m = (key: string) => String(metadata?.[key] ?? "");
  const build = (
    notificationType: NotificationType,
    url: string,
    text: (t: PushT, name: string, locale: Locale) => { title: string; body: string }
  ) => ({
    notificationType,
    payload: (t: PushT, locale: Locale) => ({ ...text(t, userName ?? t("someFriend"), locale), data: { url } }),
  });

  switch (type) {
    case "song_added":
      return build("song_added", "/feed", (t, name) => ({
        title: t("songAdded.title"),
        body: t("songAdded.body", { name, title: m("title") }),
      }));
    case "song_learning":
      return build("song_learning", "/commu", (t, name) => ({
        title: t("songLearning.title"),
        body: t("songLearning.body", { name, title: m("title"), instrument: instrumentArg(metadata?.instrument) }),
      }));
    case "song_mastered":
      return build("song_mastered", "/feed", (t, name) => ({
        title: t("songMastered.title"),
        body: t("songMastered.body", {
          name,
          title: m("title"),
          instrument: instrumentArg(metadata?.instrument),
          artist: m("artist") || "none",
        }),
      }));
    case "cover_posted":
      return build("cover_posted", "/feed", (t, name) => ({
        title: t("coverPosted.title"),
        body: t("coverPosted.body", { name }),
      }));
    case "song_wishlisted":
      return build("song_wishlisted", "/feed", (t, name) => ({
        title: t("songWishlisted.title"),
        body: t("songWishlisted.body", { name, title: m("title") }),
      }));
    case "setlist_created":
      return build("setlist_created", "/feed", (t, name) => ({
        title: t("setlistCreated.title"),
        body: t("setlistCreated.body", { name, setlist: m("name") }),
      }));
    case "band_created":
      return build("band_created", "/feed", (t, name) => ({
        title: t("bandCreated.title"),
        body: t("bandCreated.body", { name, band: m("band_name") }),
      }));
    case "band_joined":
      return build("band_joined", "/feed", (t, name) => ({
        title: t("bandJoined.title"),
        body: t("bandJoined.body", { name, band: m("band_name") }),
      }));
    case "challenge_created":
      return build("challenge_created", "/challenges", (t, name) => ({
        title: t("challengeCreated.title"),
        body: t("challengeCreated.body", { name }),
      }));
    case "challenge_accepted":
      return build("challenge_accepted", "/challenges", (t, name) => ({
        title: t("challengeAccepted.title"),
        body: t("challengeAccepted.body", { name }),
      }));
    case "challenge_completed":
      return build("challenge_completed", "/challenges", (t, name) => ({
        title: t("challengeCompleted.title"),
        body: t("challengeCompleted.body", { name }),
      }));
    case "challenge_won":
      return build("challenge_won", "/challenges", (t, name) => ({
        title: t("challengeWon.title"),
        body: t("challengeWon.body", { name }),
      }));
    case "album_wishlisted":
      return build("album_reviewed", "/feed", (t, name) => ({
        title: t("albumWishlisted.title"),
        body: t("albumWishlisted.body", { name, album: m("album_name"), artist: m("artist_name") }),
      }));
    case "album_reviewed":
      return build("album_reviewed", "/feed", (t, name, locale) => ({
        title: t("albumReviewed.title"),
        body: t("albumReviewed.body", {
          name,
          album: m("album_name"),
          stars: formatStars(metadata?.rating, INTL_LOCALE[locale]),
        }),
      }));
    case "exercise_shared":
      return build("exercise_shared", "/practice", (t, name) => ({
        title: t("exerciseShared.title"),
        body: t("exerciseShared.body", { name, exercise: m("exercise_name") }),
      }));
    case "session_completed": {
      // Une session ajoutee apres coup ne se dit pas « vient de jouer ».
      const practicedAt = Date.parse(m("practiced_at"));
      const past = Number.isFinite(practicedAt) && Date.now() - practicedAt > SESSION_PAST_AFTER_MS;
      const songs = Array.isArray(metadata?.songs) ? (metadata.songs as { title?: string }[]) : [];
      return build("session_completed", "/commu", (t, name) => ({
        title: past ? t("sessionLogged.title") : t("sessionCompleted.title"),
        body: t(past ? "sessionLogged.body" : "sessionCompleted.body", {
          name,
          minutes: Number(metadata?.duration_minutes) || 0,
          instrument: instrumentArg(metadata?.instrument),
          song: songs[0]?.title || "none",
          others: Math.max(0, songs.length - 1),
        }),
      }));
    }
    case "gear_added":
      return build("gear_added", "/feed", (t, name) => ({
        title: t("gearAdded.title"),
        body: t("gearAdded.body", { name, gear: `${m("brand")} ${m("model")}`.trim() }),
      }));
    default:
      return null;
  }
}

// === Créer une activité ===
export async function createActivity(
  input: CreateActivityInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: await tErr("notAuthenticated") };
  }

  const { error } = await supabase.from("activities").insert({
    user_id: user.id,
    type: input.type,
    reference_id: input.reference_id || null,
    metadata: input.metadata || {},
  });

  if (error) {
    console.error("Error creating activity:", error);
    return { success: false, error: await tErr("activityCreateFailed") };
  }

  // Envoyer des notifications push aux amis apres la reponse. `after`
  // garde la fonction en vie jusqu'au bout de l'envoi : une promesse non
  // attendue peut etre coupee des que la reponse est partie (Vercel).
  after(() => notifyFriendsOfActivity(supabase, user.id, input));

  revalidatePath("/feed");
  return { success: true };
}

// === Notifier les amis d'une activité ===
async function notifyFriendsOfActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  input: CreateActivityInput
): Promise<void> {
  try {

    // Récupérer le profil de l'utilisateur
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", userId)
      .single();

    const userName = profile?.display_name || profile?.username || null;

    // Récupérer tous les amis
    const { data: friendships } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (!friendships || friendships.length === 0) {
      return;
    }

    // Extraire les IDs des amis
    const friendIds = friendships.map((f) =>
      f.requester_id === userId ? f.addressee_id : f.requester_id
    );

    // Construire la notification
    const notification = getNotificationForActivity(input.type, userName, input.metadata);
    if (!notification) {
      return;
    }

    // Envoyer les notifications à tous les amis
    const notifications = friendIds.map((friendId) => ({
      userId: friendId,
      payload: notification.payload,
      notificationType: notification.notificationType,
    }));

    await sendPushNotificationToMultipleUsers(notifications);
  } catch (error) {
    console.error("Error notifying friends of activity:", error);
  }
}

// === Notifier le propriétaire d'une activité (réaction ou commentaire) ===
async function notifyActivityOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  activityId: string,
  actorId: string,
  type: "reaction" | "comment",
  emoji?: string
): Promise<void> {
  try {
    // Récupérer l'activité pour connaître le propriétaire
    const { data: activity } = await supabase
      .from("activities")
      .select("user_id")
      .eq("id", activityId)
      .single();

    if (!activity || activity.user_id === actorId) {
      // Ne pas notifier si c'est sa propre activité
      return;
    }

    // Récupérer le nom de l'utilisateur qui réagit/commente
    const { data: actorProfile } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", actorId)
      .single();

    const actorName = actorProfile?.display_name || actorProfile?.username || null;

    if (type === "reaction") {
      await sendPushNotification(
        activity.user_id,
        (t) => ({
          title: t("reaction.title"),
          body: t("reaction.body", { name: actorName ?? t("someone"), emoji: emoji ?? "" }),
          data: { url: "/feed" },
        }),
        "activity_reaction"
      );
    } else {
      await sendPushNotification(
        activity.user_id,
        (t) => ({
          title: t("comment.title"),
          body: t("comment.body", { name: actorName ?? t("someone") }),
          data: { url: "/feed" },
        }),
        "activity_comment"
      );
    }
  } catch (error) {
    console.error("Error notifying activity owner:", error);
  }
}

// === Récupérer le feed d'activités des amis ===
export async function getFeedActivities(
  limit = 50
): Promise<ActivityWithDetails[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  // Récupérer les IDs des amis
  const { data: friendships } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  const friendIds = (friendships || []).map((f) =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  );

  // Inclure l'utilisateur courant + ses amis
  const feedUserIds = [user.id, ...friendIds];

  // Récupérer les activités de l'utilisateur et de ses amis
  const { data: activities, error } = await supabase
    .from("activities")
    .select(
      `
      *,
      user:profiles!user_id(id, username, display_name, avatar_url, plan)
    `
    )
    .in("user_id", feedUserIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching activities:", error);
    return [];
  }

  if (!activities || activities.length === 0) {
    return [];
  }

  // Extraire les IDs par type pour récupérer les détails en batch
  const songIds = activities
    .filter(
      (a) =>
        (a.type === "song_added" || a.type === "song_learning" || a.type === "song_mastered") &&
        a.reference_id
    )
    .map((a) => a.reference_id);

  const coverIds = activities
    .filter((a) => a.type === "cover_posted" && a.reference_id)
    .map((a) => a.reference_id);

  const friendProfileIds = activities
    .filter((a) => a.type === "friend_added" && a.reference_id)
    .map((a) => a.reference_id);

  const wishlistSongIds = activities
    .filter((a) => a.type === "song_wishlisted" && a.reference_id)
    .map((a) => a.reference_id);

  const albumWishlistIds = activities
    .filter((a) => a.type === "album_wishlisted" && a.reference_id)
    .map((a) => a.reference_id);

  const albumReviewIds = activities
    .filter((a) => a.type === "album_reviewed" && a.reference_id)
    .map((a) => a.reference_id);

  // Récupérer tous les morceaux en une seule requête
  const songsMap = new Map<string, Song>();
  if (songIds.length > 0) {
    const { data: songs } = await supabase
      .from("songs")
      .select("*")
      .in("id", songIds);

    if (songs) {
      songs.forEach((song) => songsMap.set(song.id, song as Song));
    }
  }

  // Récupérer tous les covers en une seule requête
  const coversMap = new Map<string, CoverWithSong>();
  if (coverIds.length > 0) {
    const { data: covers } = await supabase
      .from("covers")
      .select(`*, song:songs(*), ${COVER_GEAR_SELECT}`)
      .in("id", coverIds)
      .in("visibility", ["friends", "public"]);

    if (covers) {
      covers.forEach((cover) => coversMap.set(cover.id, withCoverGear(cover) as CoverWithSong));
    }
  }

  // Récupérer tous les profils d'amis en une seule requête
  const friendsMap = new Map<string, Profile>();
  if (friendProfileIds.length > 0) {
    const { data: friends } = await supabase
      .from("profiles")
      .select(PUBLIC_PROFILE_COLUMNS)
      .in("id", friendProfileIds);

    if (friends) {
      friends.forEach((friend) => friendsMap.set(friend.id, friend as Profile));
    }
  }

  // Récupérer tous les wishlist songs en une seule requête
  const wishlistSongsMap = new Map<string, WishlistSong>();
  if (wishlistSongIds.length > 0) {
    const { data: wishlistSongs } = await supabase
      .from("wishlist_songs")
      .select("*")
      .in("id", wishlistSongIds);

    if (wishlistSongs) {
      wishlistSongs.forEach((song) => wishlistSongsMap.set(song.id, song as WishlistSong));
    }
  }

  // Récupérer tous les album wishlist items en une seule requête
  const albumWishlistMap = new Map<string, AlbumWishlistItem>();
  if (albumWishlistIds.length > 0) {
    const { data: albumWishlistItems } = await supabase
      .from("album_wishlist")
      .select("*")
      .in("id", albumWishlistIds);

    if (albumWishlistItems) {
      albumWishlistItems.forEach((item) => albumWishlistMap.set(item.id, item as AlbumWishlistItem));
    }
  }

  // Récupérer tous les album reviews en une seule requête
  const albumReviewsMap = new Map<string, AlbumReview>();
  if (albumReviewIds.length > 0) {
    const { data: albumReviews } = await supabase
      .from("album_reviews")
      .select("*")
      .in("id", albumReviewIds);

    if (albumReviews) {
      albumReviews.forEach((review) => albumReviewsMap.set(review.id, review as AlbumReview));
    }
  }

  // Mes albums deja notes ou mis de cote : pas de « À écouter » sur un
  // album que j'ai deja ecoute ou deja garde pour plus tard.
  const myReviewedAlbums = new Set<string>();
  const myWishlistedAlbums = new Set<string>();
  if (albumReviewIds.length > 0) {
    const [{ data: myReviews }, { data: myWishlist }] = await Promise.all([
      supabase.from("album_reviews").select("deezer_id, album_name, artist_name").eq("user_id", user.id),
      supabase.from("album_wishlist").select("deezer_id, album_name, artist_name").eq("user_id", user.id),
    ]);
    for (const album of myReviews ?? []) albumKeys(album).forEach((key) => myReviewedAlbums.add(key));
    for (const album of myWishlist ?? []) albumKeys(album).forEach((key) => myWishlistedAlbums.add(key));
  }

  // Les morceaux des amis que j'ai deja : pas de « Je l'apprends aussi ».
  const friendSongs = activities.flatMap((activity) => {
    if (activity.user_id === user.id || !activity.reference_id) return [];
    const song =
      activity.type === "cover_posted"
        ? coversMap.get(activity.reference_id)?.song
        : activity.type === "song_added" || activity.type === "song_learning" || activity.type === "song_mastered"
          ? songsMap.get(activity.reference_id)
          : undefined;
    // Morceau illisible (RLS) : les metadonnees de l'activite en tiennent lieu.
    const title = song?.title ?? (activity.type === "cover_posted" ? undefined : activity.metadata?.title);
    if (typeof title !== "string") return [];
    return [{
      key: activity.id,
      title,
      artist: song?.artist ?? String(activity.metadata?.artist ?? ""),
      deezer_id: song?.deezer_id,
    }];
  });
  const songsInMyLibrary = new Set(await getLibraryMatches(friendSongs));

  // Récupérer les réactions en batch pour toutes les activités
  const activityIds = activities.map((a) => a.id);
  const reactionsMap = new Map<string, ReactionSummary[]>();
  const userReactionsMap = new Map<string, string[]>();

  if (activityIds.length > 0) {
    const { data: allReactions } = await supabase
      .from("activity_reactions")
      .select("activity_id, user_id, emoji")
      .in("activity_id", activityIds);

    if (allReactions) {
      // Grouper par activity_id
      const grouped = new Map<string, { emoji: string; user_id: string }[]>();
      for (const r of allReactions) {
        const list = grouped.get(r.activity_id) || [];
        list.push({ emoji: r.emoji, user_id: r.user_id });
        grouped.set(r.activity_id, list);
      }

      for (const [actId, reactions] of grouped) {
        // Compter par emoji
        const emojiCounts = new Map<string, { count: number; reacted: boolean }>();
        const userEmojis: string[] = [];
        for (const r of reactions) {
          const existing = emojiCounts.get(r.emoji) || { count: 0, reacted: false };
          existing.count++;
          if (r.user_id === user.id) {
            existing.reacted = true;
            userEmojis.push(r.emoji);
          }
          emojiCounts.set(r.emoji, existing);
        }
        const summaries: ReactionSummary[] = [];
        for (const [emoji, data] of emojiCounts) {
          summaries.push({ emoji, count: data.count, reacted: data.reacted });
        }
        reactionsMap.set(actId, summaries);
        userReactionsMap.set(actId, userEmojis);
      }
    }
  }

  // Récupérer le nombre de commentaires en batch
  const commentCountMap = new Map<string, number>();
  if (activityIds.length > 0) {
    const { data: commentCounts } = await supabase
      .from("activity_comments")
      .select("activity_id")
      .in("activity_id", activityIds);

    if (commentCounts) {
      for (const c of commentCounts) {
        commentCountMap.set(c.activity_id, (commentCountMap.get(c.activity_id) || 0) + 1);
      }
    }
  }

  // Enrichir les activités avec les détails récupérés
  const enrichedActivities: ActivityWithDetails[] = activities.map((activity) => {
    const enriched: ActivityWithDetails = {
      ...activity,
      user: activity.user as Profile,
      reactions: reactionsMap.get(activity.id) || [],
      commentCount: commentCountMap.get(activity.id) || 0,
      currentUserReactions: userReactionsMap.get(activity.id) || [],
    };
    if (songsInMyLibrary.has(activity.id)) enriched.songInMyLibrary = true;

    if (activity.reference_id) {
      if (activity.type === "song_added" || activity.type === "song_learning" || activity.type === "song_mastered") {
        const song = songsMap.get(activity.reference_id);
        // Si le morceau n'est pas trouvé (RLS), utiliser les métadonnées comme fallback
        if (song) {
          enriched.song = song;
        } else if (activity.metadata?.title) {
          // Créer un objet Song minimal à partir des métadonnées
          enriched.song = {
            id: activity.reference_id,
            title: activity.metadata.title as string,
            artist: activity.metadata.artist as string,
            cover_url: (activity.metadata.cover_url as string) || undefined,
            tuning: "standard",
            capo_position: 0,
            progress_percent: 0,
            status: "learning",
            difficulty: undefined,
            notes: undefined,
            user_id: activity.user_id,
            created_at: activity.created_at,
            updated_at: activity.created_at,
          } as Song;
        }
      } else if (activity.type === "cover_posted") {
        enriched.cover = coversMap.get(activity.reference_id);
      } else if (activity.type === "friend_added") {
        enriched.friend = friendsMap.get(activity.reference_id);
      } else if (activity.type === "song_wishlisted") {
        const wishlistSong = wishlistSongsMap.get(activity.reference_id);
        if (wishlistSong) {
          enriched.wishlistSong = wishlistSong;
        } else if (activity.metadata?.title) {
          // Créer un objet minimal à partir des métadonnées (fallback RLS)
          enriched.wishlistSong = {
            id: activity.reference_id,
            title: activity.metadata.title as string,
            artist: activity.metadata.artist as string,
            cover_url: (activity.metadata.cover_url as string) || undefined,
            user_id: activity.user_id,
            created_at: activity.created_at,
          } as WishlistSong;
        }
      } else if (activity.type === "album_wishlisted") {
        const albumWishlistItem = albumWishlistMap.get(activity.reference_id);
        if (albumWishlistItem) {
          enriched.albumWishlistItem = albumWishlistItem;
        } else if (activity.metadata?.album_name) {
          enriched.albumWishlistItem = {
            id: activity.reference_id,
            user_id: activity.user_id,
            album_name: activity.metadata.album_name as string,
            artist_name: activity.metadata.artist_name as string,
            cover_url: (activity.metadata.cover_url as string) || undefined,
            created_at: activity.created_at,
          } as AlbumWishlistItem;
        }
      } else if (activity.type === "album_reviewed") {
        const albumReview = albumReviewsMap.get(activity.reference_id);
        if (albumReview) {
          enriched.albumReview = albumReview;
        } else if (activity.metadata?.album_name) {
          enriched.albumReview = {
            id: activity.reference_id,
            user_id: activity.user_id,
            album_name: activity.metadata.album_name as string,
            artist_name: activity.metadata.artist_name as string,
            cover_url: (activity.metadata.cover_url as string) || undefined,
            rating: activity.metadata.rating as number,
            review: (activity.metadata.review as string) || undefined,
            created_at: activity.created_at,
            updated_at: activity.created_at,
          } as AlbumReview;
        }
        if (enriched.albumReview && activity.user_id !== user.id) {
          const keys = albumKeys(enriched.albumReview);
          if (keys.some((key) => myReviewedAlbums.has(key))) enriched.myAlbumStatus = "reviewed";
          else if (keys.some((key) => myWishlistedAlbums.has(key))) enriched.myAlbumStatus = "wishlisted";
        }
      }
    }

    return enriched;
  });

  return enrichedActivities;
}

/** Ce qui identifie un album : son identifiant Deezer, et son titre et artiste (albums saisis a la main). */
function albumKeys(album: { deezer_id?: string | null; album_name: string; artist_name: string }): string[] {
  const keys = [`name:${album.album_name.toLowerCase()}|${album.artist_name.toLowerCase()}`];
  if (album.deezer_id) keys.push(`deezer:${album.deezer_id}`);
  return keys;
}

// Une reaction est un seul emoji. Le selecteur en propose tout le
// catalogue, mais l'action reste appelable avec n'importe quelle chaine.
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

function isSingleEmoji(value: string): boolean {
  if (!value || value.length > 32) return false;
  if ([...graphemes.segment(value)].length !== 1) return false;
  return /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3/u.test(value);
}

// === Toggle une réaction sur une activité ===
export async function toggleReaction(
  activityId: string,
  emoji: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: await tErr("notAuthenticated") };
  }

  if (!isSingleEmoji(emoji)) {
    return { success: false, error: await tErr("invalidReaction") };
  }

  // Vérifier si la réaction existe déjà
  const { data: existing } = await supabase
    .from("activity_reactions")
    .select("id")
    .eq("activity_id", activityId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .single();

  if (existing) {
    // Supprimer la réaction
    const { error } = await supabase
      .from("activity_reactions")
      .delete()
      .eq("id", existing.id);

    if (error) {
      console.error("Error removing reaction:", error);
      return { success: false, error: await tErr("reactionDeleteFailed") };
    }
  } else {
    // Ajouter la réaction
    const { error } = await supabase.from("activity_reactions").insert({
      activity_id: activityId,
      user_id: user.id,
      emoji,
    });

    if (error) {
      console.error("Error adding reaction:", error);
      return { success: false, error: await tErr("reactionAddFailed") };
    }

    // Notifier le propriétaire de l'activité
    after(() => notifyActivityOwner(supabase, activityId, user.id, "reaction", emoji));
  }

  revalidatePath("/feed");
  return { success: true };
}

// === Ajouter un commentaire ===
export async function addComment(
  activityId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: await tErr("notAuthenticated") };
  }

  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 500) {
    return { success: false, error: await tErr("commentLength") };
  }

  const { error } = await supabase.from("activity_comments").insert({
    activity_id: activityId,
    user_id: user.id,
    content: trimmed,
  });

  if (error) {
    console.error("Error adding comment:", error);
    return { success: false, error: await tErr("commentAddFailed") };
  }

  // Notifier le propriétaire de l'activité
  after(() => notifyActivityOwner(supabase, activityId, user.id, "comment"));

  revalidatePath("/feed");
  return { success: true };
}

// === Modifier un commentaire ===
export async function updateComment(
  commentId: string,
  content: string
): Promise<{ success: boolean; error?: string; data?: { content: string; edited_at: string | null } }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: await tErr("notAuthenticated") };
  }

  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 500) {
    return { success: false, error: await tErr("commentLength") };
  }

  const { data, error } = await supabase
    .from("activity_comments")
    .update({ content: trimmed })
    .eq("id", commentId)
    .eq("user_id", user.id)
    .select("content, edited_at")
    .single();

  if (error || !data) {
    console.error("Error updating comment:", error);
    return { success: false, error: await tErr("commentUpdateFailed") };
  }

  revalidatePath("/feed");
  return { success: true, data };
}

// === Supprimer un commentaire ===
export async function deleteComment(
  commentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: await tErr("notAuthenticated") };
  }

  const { error } = await supabase
    .from("activity_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting comment:", error);
    return { success: false, error: await tErr("commentDeleteFailed") };
  }

  revalidatePath("/feed");
  return { success: true };
}

// === Récupérer les commentaires d'une activité ===
export async function getActivityComments(
  activityId: string
): Promise<ActivityCommentWithProfile[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  const { data: comments, error } = await supabase
    .from("activity_comments")
    .select(`
      *,
      user:profiles!user_id(id, username, display_name, avatar_url, plan)
    `)
    .eq("activity_id", activityId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching comments:", error);
    return [];
  }

  return (comments || []).map((c) => ({
    ...c,
    user: c.user as Profile,
  })) as ActivityCommentWithProfile[];
}

// === Récupérer les activités récentes d'un ami spécifique ===
export async function getFriendRecentActivities(
  friendId: string,
  limit = 5
): Promise<ActivityWithDetails[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  // Vérifier qu'ils sont amis
  const { data: friendship } = await supabase
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`
    )
    .single();

  if (!friendship) {
    return [];
  }

  const { data: activities } = await supabase
    .from("activities")
    .select(
      `
      *,
      user:profiles!user_id(id, username, display_name, avatar_url, plan)
    `
    )
    .eq("user_id", friendId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!activities) {
    return [];
  }

  return activities.map((activity) => ({
    ...activity,
    user: activity.user as Profile,
  }));
}

// === Récupérer les données d'interaction d'une cover (via son activité) ===
export async function getCoverActivityData(
  coverId: string
): Promise<{
  activityId: string;
  reactions: ReactionSummary[];
  currentUserReactions: string[];
  commentCount: number;
  currentUserId: string;
} | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) return null;

  // Trouver l'activité associée à cette cover
  const { data: activity } = await supabase
    .from("activities")
    .select("id")
    .eq("type", "cover_posted")
    .eq("reference_id", coverId)
    .single();

  if (!activity) return null;

  // Récupérer les réactions
  const { data: allReactions } = await supabase
    .from("activity_reactions")
    .select("user_id, emoji")
    .eq("activity_id", activity.id);

  const reactions: ReactionSummary[] = [];
  const currentUserReactions: string[] = [];

  if (allReactions && allReactions.length > 0) {
    const emojiCounts = new Map<string, { count: number; reacted: boolean }>();
    for (const r of allReactions) {
      const existing = emojiCounts.get(r.emoji) || { count: 0, reacted: false };
      existing.count++;
      if (r.user_id === user.id) {
        existing.reacted = true;
        currentUserReactions.push(r.emoji);
      }
      emojiCounts.set(r.emoji, existing);
    }
    for (const [emoji, data] of emojiCounts) {
      reactions.push({ emoji, count: data.count, reacted: data.reacted });
    }
  }

  // Compter les commentaires
  const { count } = await supabase
    .from("activity_comments")
    .select("*", { count: "exact", head: true })
    .eq("activity_id", activity.id);

  return {
    activityId: activity.id,
    reactions,
    currentUserReactions,
    commentCount: count || 0,
    currentUserId: user.id,
  };
}

/**
 * Reagir a une cover, en un geste.
 *
 * Le feed connait deja l'identifiant d'activite de chaque cover et peut
 * appeler `toggleReaction` directement. Cette variante couvre le cas
 * inverse : une cover partagee dont l'activite n'existe pas — publiee
 * en prive puis repassee en « amis », ou anterieure au feed. Sans elle,
 * ces covers affichaient un bouton de reaction sans effet.
 */
export async function toggleCoverReaction(
  coverId: string,
  emoji: string
): Promise<{ success: boolean; activityId?: string; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: await tErr("notAuthenticated") };
  }

  if (!isSingleEmoji(emoji)) {
    return { success: false, error: await tErr("invalidReaction") };
  }

  const { data: cover } = await supabase
    .from("covers")
    .select("id, user_id, visibility")
    .eq("id", coverId)
    .maybeSingle();

  // La RLS a deja filtre : si la ligne revient, elle est visible.
  if (!cover) {
    return { success: false, error: await tErr("coverNotFound") };
  }

  if (cover.visibility === "private") {
    return { success: false, error: await tErr("coverNotShared") };
  }

  let { data: activity } = await supabase
    .from("activities")
    .select("id")
    .eq("type", "cover_posted")
    .eq("reference_id", coverId)
    .maybeSingle();

  if (!activity) {
    // On ne peut creer l'activite que pour ses propres covers : `activities`
    // n'autorise l'insertion que sur sa propre ligne.
    if (cover.user_id !== user.id) {
      return {
        success: false,
        error: await tErr("coverNotInFeed"),
      };
    }

    const { data: created } = await supabase
      .from("activities")
      .insert({
        user_id: user.id,
        type: "cover_posted",
        reference_id: coverId,
        metadata: { visibility: cover.visibility },
      })
      .select("id")
      .single();

    if (!created) {
      return { success: false, error: await tErr("reactionFailed") };
    }
    activity = created;
  }

  const result = await toggleReaction(activity.id, emoji);
  if (!result.success) return result;

  revalidatePath("/commu/covers");
  return { success: true, activityId: activity.id };
}
