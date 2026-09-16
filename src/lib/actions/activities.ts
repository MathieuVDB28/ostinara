"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { sendPushNotification, sendPushNotificationToMultipleUsers } from "@/lib/notifications";
import type { NotificationPayload, NotificationType } from "@/lib/notifications";
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
    case "album_wishlisted":
      return {
        payload: {
          title: "Album à écouter",
          body: `${userName} veut écouter "${metadata?.album_name}" de ${metadata?.artist_name}`,
          data: { url: "/feed" },
        },
        notificationType: "album_reviewed",
      };
    case "album_reviewed":
      return {
        payload: {
          title: "Nouvelle ecoute",
          body: `${userName} a ecoute "${metadata?.album_name}" - ${metadata?.rating}/10`,
          data: { url: "/feed" },
        },
        notificationType: "album_reviewed",
      };
    case "exercise_shared":
      return {
        payload: {
          title: "Nouvel exercice partage",
          body: `${userName} a partage l'exercice "${metadata?.exercise_name}"`,
          data: { url: "/practice" },
        },
        notificationType: "exercise_shared",
      };
    case "gear_added":
      return {
        payload: {
          title: "Nouveau matos",
          body: `${userName} a ajouté "${metadata?.brand} ${metadata?.model}" à sa collection`,
          data: { url: "/feed" },
        },
        notificationType: "gear_added",
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
  const user = await getAuthenticatedUser();

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

    const actorName = actorProfile?.display_name || actorProfile?.username || "Quelqu'un";

    if (type === "reaction") {
      await sendPushNotification(
        activity.user_id,
        {
          title: "Nouvelle reaction",
          body: `${actorName} a reagi ${emoji} a ton activite`,
          data: { url: "/feed" },
        },
        "activity_reaction"
      );
    } else {
      await sendPushNotification(
        activity.user_id,
        {
          title: "Nouveau commentaire",
          body: `${actorName} a commente ton activite`,
          data: { url: "/feed" },
        },
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
      }
    }

    return enriched;
  });

  return enrichedActivities;
}

// === Toggle une réaction sur une activité ===
export async function toggleReaction(
  activityId: string,
  emoji: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
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
      return { success: false, error: "Erreur lors de la suppression de la réaction" };
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
      return { success: false, error: "Erreur lors de l'ajout de la réaction" };
    }

    // Notifier le propriétaire de l'activité
    notifyActivityOwner(supabase, activityId, user.id, "reaction", emoji).catch(console.error);
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
    return { success: false, error: "Non authentifié" };
  }

  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 500) {
    return { success: false, error: "Le commentaire doit faire entre 1 et 500 caractères" };
  }

  const { error } = await supabase.from("activity_comments").insert({
    activity_id: activityId,
    user_id: user.id,
    content: trimmed,
  });

  if (error) {
    console.error("Error adding comment:", error);
    return { success: false, error: "Erreur lors de l'ajout du commentaire" };
  }

  // Notifier le propriétaire de l'activité
  notifyActivityOwner(supabase, activityId, user.id, "comment").catch(console.error);

  revalidatePath("/feed");
  return { success: true };
}

// === Supprimer un commentaire ===
export async function deleteComment(
  commentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  const { error } = await supabase
    .from("activity_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting comment:", error);
    return { success: false, error: "Erreur lors de la suppression du commentaire" };
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
    return { success: false, error: "Non authentifié" };
  }

  const { data: cover } = await supabase
    .from("covers")
    .select("id, user_id, visibility")
    .eq("id", coverId)
    .maybeSingle();

  // La RLS a deja filtre : si la ligne revient, elle est visible.
  if (!cover) {
    return { success: false, error: "Cover introuvable" };
  }

  if (cover.visibility === "private") {
    return { success: false, error: "Cette cover n'est pas partagée" };
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
        error: "Cette cover n'est pas encore publiée dans le feed",
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
      return { success: false, error: "Erreur lors de la réaction" };
    }
    activity = created;
  }

  const result = await toggleReaction(activity.id, emoji);
  if (!result.success) return result;

  revalidatePath("/commu/covers");
  return { success: true, activityId: activity.id };
}
