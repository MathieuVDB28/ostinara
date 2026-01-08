"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendPushNotificationToMultipleUsers } from "@/lib/notifications";
import type { NotificationPayload, NotificationType } from "@/lib/notifications";
import type {
  ActivityWithDetails,
  CreateActivityInput,
  Song,
  CoverWithSong,
  Profile,
  WishlistSong,
} from "@/types";

// Mapper les types d'activités vers les types de notifications
function getNotificationForActivity(
  type: CreateActivityInput["type"],
  userName: string,
  metadata?: Record<string, unknown>
): { payload: NotificationPayload; notificationType: NotificationType } | null {
  switch (type) {
    case "song_added":
      return {
        payload: {
          title: "Nouveau morceau",
          body: `${userName} a ajouté "${metadata?.title}" à sa bibliothèque`,
          data: { url: "/feed" },
        },
        notificationType: "song_added",
      };
    case "song_mastered":
      return {
        payload: {
          title: "Morceau maîtrisé !",
          body: `${userName} a maîtrisé "${metadata?.title}" - ${metadata?.artist}`,
          data: { url: "/feed" },
        },
        notificationType: "song_mastered",
      };
    case "cover_posted":
      return {
        payload: {
          title: "Nouvelle cover",
          body: `${userName} a publié une nouvelle cover !`,
          data: { url: "/feed" },
        },
        notificationType: "cover_posted",
      };
    case "song_wishlisted":
      return {
        payload: {
          title: "Wishlist",
          body: `${userName} veut apprendre "${metadata?.title}"`,
          data: { url: "/feed" },
        },
        notificationType: "song_wishlisted",
      };
    case "setlist_created":
      return {
        payload: {
          title: "Nouvelle setlist",
          body: `${userName} a cree la setlist "${metadata?.name}"`,
          data: { url: "/feed" },
        },
        notificationType: "setlist_created",
      };
    case "band_created":
      return {
        payload: {
          title: "Nouveau groupe",
          body: `${userName} a cree le groupe "${metadata?.band_name}"`,
          data: { url: "/feed" },
        },
        notificationType: "band_created",
      };
    case "band_joined":
      return {
        payload: {
          title: "Nouveau membre",
          body: `${userName} a rejoint ${metadata?.band_name}`,
          data: { url: "/feed" },
        },
        notificationType: "band_joined",
      };
    case "challenge_created":
      return {
        payload: {
          title: "Nouveau defi !",
          body: `${userName} te lance un defi !`,
          data: { url: "/challenges" },
        },
        notificationType: "challenge_created",
      };
    case "challenge_accepted":
      return {
        payload: {
          title: "Defi accepte !",
          body: `${userName} a accepte ton defi. C'est parti !`,
          data: { url: "/challenges" },
        },
        notificationType: "challenge_accepted",
      };
    case "challenge_completed":
      return {
        payload: {
          title: "Defi termine",
          body: `Un defi avec ${userName} vient de se terminer`,
          data: { url: "/challenges" },
        },
        notificationType: "challenge_completed",
      };
    case "challenge_won":
      return {
        payload: {
          title: "Victoire !",
          body: `${userName} a remporte un defi !`,
          data: { url: "/challenges" },
        },
        notificationType: "challenge_won",
      };
    default:
      return null;
  }
}

// === Créer une activité ===
export async function createActivity(
  input: CreateActivityInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  const { error } = await supabase.from("activities").insert({
    user_id: user.id,
    type: input.type,
    reference_id: input.reference_id || null,
    metadata: input.metadata || {},
  });

  if (error) {
    console.error("Error creating activity:", error);
    return { success: false, error: "Erreur lors de la création de l'activité" };
  }

  // Envoyer des notifications push aux amis (en arrière-plan)
  notifyFriendsOfActivity(user.id, input).catch(console.error);

  revalidatePath("/feed");
  return { success: true };
}

// === Notifier les amis d'une activité ===
async function notifyFriendsOfActivity(
  userId: string,
  input: CreateActivityInput
): Promise<void> {
  try {
    const supabase = await createClient();

    // Récupérer le profil de l'utilisateur
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", userId)
      .single();

    const userName = profile?.display_name || profile?.username || "Un ami";

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

// === Récupérer le feed d'activités des amis ===
export async function getFeedActivities(
  limit = 50
): Promise<ActivityWithDetails[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Récupérer les IDs des amis
  const { data: friendships } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  if (!friendships || friendships.length === 0) {
    return [];
  }

  const friendIds = friendships.map((f) =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  );

  // Récupérer les activités des amis
  const { data: activities, error } = await supabase
    .from("activities")
    .select(
      `
      *,
      user:profiles!user_id(id, username, display_name, avatar_url, plan)
    `
    )
    .in("user_id", friendIds)
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
    .filter((a) => (a.type === "song_added" || a.type === "song_mastered") && a.reference_id)
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
      .select(`*, song:songs(*)`)
      .in("id", coverIds)
      .in("visibility", ["friends", "public"]);

    if (covers) {
      covers.forEach((cover) => coversMap.set(cover.id, cover as CoverWithSong));
    }
  }

  // Récupérer tous les profils d'amis en une seule requête
  const friendsMap = new Map<string, Profile>();
  if (friendProfileIds.length > 0) {
    const { data: friends } = await supabase
      .from("profiles")
      .select("*")
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

  // Enrichir les activités avec les détails récupérés
  const enrichedActivities: ActivityWithDetails[] = activities.map((activity) => {
    const enriched: ActivityWithDetails = {
      ...activity,
      user: activity.user as Profile,
    };

    if (activity.reference_id) {
      if (activity.type === "song_added" || activity.type === "song_mastered") {
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
      }
    }

    return enriched;
  });

  return enrichedActivities;
}

// === Récupérer les activités récentes d'un ami spécifique ===
export async function getFriendRecentActivities(
  friendId: string,
  limit = 5
): Promise<ActivityWithDetails[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
