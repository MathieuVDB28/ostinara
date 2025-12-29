"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createActivity } from "./activities";
import { sendPushNotification } from "@/lib/notifications";
import type {
  Friend,
  FriendRequest,
  FriendProfile,
  UserSearchResult,
  Profile,
  Song,
  CoverWithSong,
  Friendship,
} from "@/types";

const FREE_PLAN_FRIENDS_LIMIT = 5;

// === HELPER: Vérifier la limite d'amis pour le plan free ===
async function canAddFriend(): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { allowed: false, reason: "Non authentifié" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (profile?.plan !== "free") {
    return { allowed: true };
  }

  // Compter les amis acceptés
  const { count } = await supabase
    .from("friendships")
    .select("*", { count: "exact", head: true })
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  if (count !== null && count >= FREE_PLAN_FRIENDS_LIMIT) {
    return {
      allowed: false,
      reason: `Tu as atteint la limite de ${FREE_PLAN_FRIENDS_LIMIT} amis. Passe en Pro pour en ajouter plus !`,
    };
  }

  return { allowed: true };
}

// === Rechercher des utilisateurs par username ===
export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !query.trim()) {
    return [];
  }

  // Rechercher les profils correspondants
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .ilike("username", `%${query}%`)
    .limit(10);

  if (error || !profiles) {
    console.error("Error searching users:", error);
    return [];
  }

  // Récupérer les relations existantes avec ces profils
  const profileIds = profiles.map((p) => p.id);

  const { data: friendships } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id, status")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.in.(${profileIds.join(",")})),and(addressee_id.eq.${user.id},requester_id.in.(${profileIds.join(",")}))`
    );

  // Mapper les résultats avec le statut d'amitié
  return profiles.map((profile) => {
    if (profile.id === user.id) {
      return { ...profile, friendshipStatus: "self" as const };
    }

    const friendship = friendships?.find(
      (f) =>
        (f.requester_id === user.id && f.addressee_id === profile.id) ||
        (f.addressee_id === user.id && f.requester_id === profile.id)
    );

    return {
      ...profile,
      friendshipStatus: friendship?.status || ("none" as const),
    };
  });
}

// === Envoyer une demande d'ami ===
export async function sendFriendRequest(
  addresseeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  if (user.id === addresseeId) {
    return { success: false, error: "Tu ne peux pas t'ajouter toi-même" };
  }

  // Vérifier la limite d'amis
  const limitCheck = await canAddFriend();
  if (!limitCheck.allowed) {
    return { success: false, error: limitCheck.reason };
  }

  // Vérifier si une relation existe déjà
  const { data: existing } = await supabase
    .from("friendships")
    .select("id, status")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`
    )
    .single();

  if (existing) {
    if (existing.status === "accepted") {
      return { success: false, error: "Vous êtes déjà amis" };
    }
    if (existing.status === "pending") {
      return { success: false, error: "Une demande est déjà en attente" };
    }
    if (existing.status === "blocked") {
      return { success: false, error: "Impossible d'envoyer une demande" };
    }
  }

  // Récupérer le profil de l'utilisateur qui envoie la demande
  const { data: requesterProfile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .single();

  // Créer la demande
  const { error } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: addresseeId,
    status: "pending",
  });

  if (error) {
    console.error("Error sending friend request:", error);
    return { success: false, error: "Erreur lors de l'envoi de la demande" };
  }

  // Envoyer une notification push au destinataire
  const senderName = requesterProfile?.display_name || requesterProfile?.username || "Quelqu'un";
  await sendPushNotification(
    addresseeId,
    {
      title: "Nouvelle demande d'ami",
      body: `${senderName} veut devenir ton ami !`,
      data: { url: "/friends" },
    },
    "friend_request"
  );

  revalidatePath("/friends");
  return { success: true };
}

// === Accepter une demande d'ami ===
export async function acceptFriendRequest(
  friendshipId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  // Vérifier la limite d'amis
  const limitCheck = await canAddFriend();
  if (!limitCheck.allowed) {
    return { success: false, error: limitCheck.reason };
  }

  // Vérifier que la demande existe et est adressée à l'utilisateur
  const { data: friendship } = await supabase
    .from("friendships")
    .select(
      "*, requester:profiles!friendships_requester_id_fkey(id, username, display_name)"
    )
    .eq("id", friendshipId)
    .eq("addressee_id", user.id)
    .eq("status", "pending")
    .single();

  if (!friendship) {
    return { success: false, error: "Demande non trouvée" };
  }

  // Mettre à jour le statut
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", friendshipId);

  if (error) {
    console.error("Error accepting friend request:", error);
    return { success: false, error: "Erreur lors de l'acceptation" };
  }

  // Créer une activité pour l'utilisateur qui accepte
  await createActivity({
    type: "friend_added",
    reference_id: friendship.requester_id,
    metadata: {
      friend_username: (friendship.requester as Profile).username,
    },
  });

  // Récupérer le profil de l'utilisateur qui accepte
  const { data: accepterProfile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .single();

  // Notifier le demandeur que sa demande a été acceptée
  const accepterName = accepterProfile?.display_name || accepterProfile?.username || "Quelqu'un";
  await sendPushNotification(
    friendship.requester_id,
    {
      title: "Demande acceptée !",
      body: `${accepterName} a accepté ta demande d'ami`,
      data: { url: "/friends" },
    },
    "friend_accepted"
  );

  revalidatePath("/friends");
  revalidatePath("/feed");
  return { success: true };
}

// === Rejeter une demande d'ami ===
export async function rejectFriendRequest(
  friendshipId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId)
    .eq("addressee_id", user.id)
    .eq("status", "pending");

  if (error) {
    console.error("Error rejecting friend request:", error);
    return { success: false, error: "Erreur lors du rejet" };
  }

  revalidatePath("/friends");
  return { success: true };
}

// === Supprimer un ami ===
export async function removeFriend(
  friendshipId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId)
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  if (error) {
    console.error("Error removing friend:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/friends");
  return { success: true };
}

// === Bloquer un utilisateur ===
export async function blockUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  // Vérifier si une relation existe
  const { data: existing } = await supabase
    .from("friendships")
    .select("id")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`
    )
    .single();

  if (existing) {
    // Supprimer la relation existante et en créer une nouvelle blocked
    await supabase.from("friendships").delete().eq("id", existing.id);
  }

  // Créer une nouvelle relation blocked
  const { error } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: userId,
    status: "blocked",
  });

  if (error) {
    console.error("Error blocking user:", error);
    return { success: false, error: "Erreur lors du blocage" };
  }

  revalidatePath("/friends");
  return { success: true };
}

// === Récupérer la liste des amis ===
export async function getFriends(): Promise<Friend[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("friendships")
    .select(
      `
      id,
      created_at,
      requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_url, plan),
      addressee:profiles!friendships_addressee_id_fkey(id, username, display_name, avatar_url, plan)
    `
    )
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching friends:", error);
    return [];
  }

  // Mapper pour retourner le profil de l'ami (pas le nôtre)
  return data.map((f) => {
    const requester = f.requester as unknown as Profile;
    const addressee = f.addressee as unknown as Profile;
    return {
      id: f.id,
      profile: requester.id === user.id ? addressee : requester,
      since: f.created_at,
    };
  });
}

// === Récupérer les demandes en attente ===
export async function getPendingRequests(): Promise<FriendRequest[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("friendships")
    .select(
      `
      id,
      created_at,
      requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_url)
    `
    )
    .eq("addressee_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching pending requests:", error);
    return [];
  }

  return data.map((r) => ({
    id: r.id,
    requester: r.requester as unknown as Profile,
    created_at: r.created_at,
  }));
}

// === Compter les demandes en attente (pour le badge) ===
export async function getPendingRequestsCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  const { count, error } = await supabase
    .from("friendships")
    .select("*", { count: "exact", head: true })
    .eq("addressee_id", user.id)
    .eq("status", "pending");

  if (error) {
    console.error("Error counting pending requests:", error);
    return 0;
  }

  return count || 0;
}

// === Compter le nombre total d'amis acceptés ===
export async function getFriendsCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  const { count, error } = await supabase
    .from("friendships")
    .select("*", { count: "exact", head: true })
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  if (error) {
    console.error("Error counting friends:", error);
    return 0;
  }

  return count || 0;
}

// === Récupérer le profil complet d'un ami ===
export async function getFriendProfile(
  friendId: string
): Promise<FriendProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Vérifier qu'ils sont amis
  const { data: friendship } = await supabase
    .from("friendships")
    .select("*")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`
    )
    .single();

  if (!friendship) {
    return null;
  }

  // Récupérer le profil
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", friendId)
    .single();

  if (!profile) {
    return null;
  }

  // Récupérer les morceaux de l'ami
  const { data: songs } = await supabase
    .from("songs")
    .select("*")
    .eq("user_id", friendId)
    .order("created_at", { ascending: false });

  // Récupérer les covers visibles (friends ou public)
  const { data: covers } = await supabase
    .from("covers")
    .select(`*, song:songs(*)`)
    .eq("user_id", friendId)
    .in("visibility", ["friends", "public"])
    .order("created_at", { ascending: false });

  const songsList = (songs || []) as Song[];

  return {
    profile: profile as Profile,
    songs: songsList,
    covers: (covers || []) as CoverWithSong[],
    friendship: friendship as Friendship,
    stats: {
      totalSongs: songsList.length,
      masteredSongs: songsList.filter((s) => s.status === "mastered").length,
      totalCovers: (covers || []).length,
    },
  };
}

// === Vérifier les infos de limite d'amis ===
export async function getFriendsLimitInfo(): Promise<{
  isLimited: boolean;
  current: number;
  limit: number;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (profile?.plan !== "free") {
    return null;
  }

  const { count } = await supabase
    .from("friendships")
    .select("*", { count: "exact", head: true })
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  return {
    isLimited: true,
    current: count || 0,
    limit: FREE_PLAN_FRIENDS_LIMIT,
  };
}
