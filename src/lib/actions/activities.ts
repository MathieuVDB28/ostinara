"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  ActivityWithDetails,
  CreateActivityInput,
  Song,
  CoverWithSong,
  Profile,
} from "@/types";

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

  revalidatePath("/feed");
  return { success: true };
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
