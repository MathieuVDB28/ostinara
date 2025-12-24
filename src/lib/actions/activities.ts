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

  // Enrichir les activités avec les détails
  const enrichedActivities: ActivityWithDetails[] = [];

  for (const activity of activities) {
    const enriched: ActivityWithDetails = {
      ...activity,
      user: activity.user as Profile,
    };

    if (activity.reference_id) {
      switch (activity.type) {
        case "song_added":
        case "song_mastered": {
          const { data: song } = await supabase
            .from("songs")
            .select("*")
            .eq("id", activity.reference_id)
            .single();
          if (song) {
            enriched.song = song as Song;
          }
          break;
        }
        case "cover_posted": {
          const { data: cover } = await supabase
            .from("covers")
            .select(`*, song:songs(*)`)
            .eq("id", activity.reference_id)
            .in("visibility", ["friends", "public"])
            .single();
          if (cover) {
            enriched.cover = cover as CoverWithSong;
          }
          break;
        }
        case "friend_added": {
          const { data: friend } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", activity.reference_id)
            .single();
          if (friend) {
            enriched.friend = friend as Profile;
          }
          break;
        }
      }
    }

    enrichedActivities.push(enriched);
  }

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
