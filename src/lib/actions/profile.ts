"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  UserProfile,
  PublicProfile,
  UpdateProfileInput,
  SetFavoriteSongInput,
  SetFavoriteAlbumInput,
  Profile,
  FavoriteSong,
  FavoriteAlbum,
} from "@/types";

/**
 * Upload un avatar pour l'utilisateur connecté
 * @param file - Le fichier image à uploader
 * @returns L'URL publique de l'avatar ou une erreur
 */
export async function uploadAvatar(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  const file = formData.get("avatar") as File;
  if (!file) {
    return { success: false, error: "Aucun fichier fourni" };
  }

  // Vérifier le type de fichier
  if (!file.type.startsWith("image/")) {
    return { success: false, error: "Le fichier doit être une image" };
  }

  // Vérifier la taille (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    return { success: false, error: "L'image ne doit pas dépasser 2MB" };
  }

  // Nom du fichier : userId/avatar.ext
  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}/avatar.${fileExt}`;

  // Supprimer l'ancien avatar s'il existe
  const { data: existingFiles } = await supabase.storage
    .from("avatars")
    .list(user.id);

  if (existingFiles && existingFiles.length > 0) {
    await supabase.storage
      .from("avatars")
      .remove(existingFiles.map(f => `${user.id}/${f.name}`));
  }

  // Upload du nouveau fichier
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return { success: false, error: `Erreur lors de l'upload: ${uploadError.message}` };
  }

  // Récupérer l'URL publique
  const { data: { publicUrl } } = supabase.storage
    .from("avatars")
    .getPublicUrl(fileName);

  // Mettre à jour le profil avec la nouvelle URL
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (updateError) {
    console.error("Profile update error:", updateError);
    return { success: false, error: "Erreur lors de la mise à jour du profil" };
  }

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  revalidatePath("/", "layout");

  return { success: true, url: publicUrl };
}

/**
 * Récupère le profil complet de l'utilisateur connecté
 * Inclut : profil, favoris (morceaux + albums), stats
 */
export async function getMyProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Récupérer le profil
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  // Récupérer les morceaux favoris avec leurs données complètes
  const { data: favoriteSongs } = await supabase
    .from("favorite_songs")
    .select(`
      id,
      user_id,
      song_id,
      position,
      created_at,
      song:songs!song_id(*)
    `)
    .eq("user_id", user.id)
    .order("position");

  // Récupérer les albums favoris
  const { data: favoriteAlbums } = await supabase
    .from("favorite_albums")
    .select("*")
    .eq("user_id", user.id)
    .order("position");

  // Calculer les stats en parallèle
  const [songsCount, masteredCount, coversCount, friendsCount] = await Promise.all([
    supabase.from("songs").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("songs").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "mastered"),
    supabase.from("covers").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("friendships").select("*", { count: "exact", head: true }).eq("status", "accepted").or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
  ]);

  // Mapper les favorite songs pour convertir song de tableau à objet
  const mappedFavoriteSongs = (favoriteSongs || []).map((fs: any) => ({
    ...fs,
    song: Array.isArray(fs.song) ? fs.song[0] : fs.song,
  }));

  return {
    ...(profile as Profile),
    favorite_songs: mappedFavoriteSongs as FavoriteSong[],
    favorite_albums: (favoriteAlbums || []) as FavoriteAlbum[],
    stats: {
      totalSongs: songsCount.count || 0,
      masteredSongs: masteredCount.count || 0,
      totalCovers: coversCount.count || 0,
      friendsCount: friendsCount.count || 0,
    },
  };
}

/**
 * Récupère un profil public avec logique de confidentialité
 * @param userId - ID de l'utilisateur dont on veut voir le profil
 * @returns PublicProfile avec données conditionnelles selon is_private et amitié
 */
export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Récupérer le profil de base
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profile) return null;

  const isOwner = user?.id === userId;

  // Vérifier le statut d'amitié
  let isFriend = false;
  let friendshipStatus: 'none' | 'self' | 'pending' | 'accepted' | 'blocked' = 'none';

  if (user && !isOwner) {
    const { data: friendship } = await supabase
      .from("friendships")
      .select("status")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`)
      .maybeSingle();

    if (friendship) {
      friendshipStatus = friendship.status;
      isFriend = friendship.status === 'accepted';
    }
  } else if (isOwner) {
    friendshipStatus = 'self';
  }

  // Déterminer si on peut voir le contenu privé
  const canViewPrivateContent = isOwner || !profile.is_private || isFriend;

  // Initialiser les données conditionnelles
  let favoriteSongs = null;
  let favoriteAlbums = null;
  let recentSongs = null;
  let totalSongs = null;
  let masteredSongs = null;

  if (canViewPrivateContent) {
    // Récupérer les favoris et morceaux si autorisé
    const [favSongsData, favAlbumsData, songsData, songsCountData, masteredCountData] = await Promise.all([
      supabase
        .from("favorite_songs")
        .select(`
          id,
          user_id,
          song_id,
          position,
          created_at,
          song:songs(*)
        `)
        .eq("user_id", userId)
        .order("position"),
      supabase
        .from("favorite_albums")
        .select("*")
        .eq("user_id", userId)
        .order("position"),
      supabase
        .from("songs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("songs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("songs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "mastered"),
    ]);

    // Mapper les favorite songs pour convertir song de tableau à objet
    const mappedFavSongs = (favSongsData.data || []).map((fs: any) => ({
      ...fs,
      song: Array.isArray(fs.song) ? fs.song[0] : fs.song,
    }));

    favoriteSongs = mappedFavSongs as FavoriteSong[];
    favoriteAlbums = (favAlbumsData.data as FavoriteAlbum[]) || [];
    recentSongs = songsData.data || [];
    totalSongs = songsCountData.count || 0;
    masteredSongs = masteredCountData.count || 0;
  }

  // Récupérer les covers en respectant leur visibilité
  let coversFilter = ["public"];
  if (isOwner) {
    coversFilter = ["public", "friends", "private"];
  } else if (isFriend) {
    coversFilter = ["public", "friends"];
  }

  const { data: covers, count: coversCount } = await supabase
    .from("covers")
    .select(`
      id,
      user_id,
      song_id,
      media_url,
      media_type,
      thumbnail_url,
      duration_seconds,
      file_size_bytes,
      visibility,
      description,
      created_at,
      song:songs(*)
    `, { count: "exact" })
    .eq("user_id", userId)
    .in("visibility", coversFilter)
    .order("created_at", { ascending: false })
    .limit(6);

  // Mapper les covers pour convertir song de tableau à objet
  const mappedCovers = (covers || []).map((cover: any) => ({
    ...cover,
    song: Array.isArray(cover.song) ? cover.song[0] : cover.song,
  }));

  return {
    profile: profile as Profile,
    favorite_songs: favoriteSongs,
    favorite_albums: favoriteAlbums,
    recent_songs: recentSongs,
    recent_covers: mappedCovers,
    stats: {
      totalSongs,
      masteredSongs,
      totalCovers: coversCount || 0,
    },
    friendship_status: friendshipStatus,
    is_friend: isFriend,
  };
}

/**
 * Met à jour le profil de l'utilisateur connecté
 * @param input - Champs à mettre à jour
 */
export async function updateProfile(input: UpdateProfileInput): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  // Validation basique côté serveur
  if (input.bio && input.bio.length > 160) {
    return { success: false, error: "La bio ne peut pas dépasser 160 caractères" };
  }

  const { error } = await supabase
    .from("profiles")
    .update(input)
    .eq("id", user.id);

  if (error) {
    console.error("Error updating profile:", error);
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  revalidatePath("/", "layout"); // Revalider le layout pour mettre à jour la sidebar
  return { success: true };
}

/**
 * Ajoute ou met à jour un morceau favori
 * @param input - Morceau et position (1-4)
 */
export async function setFavoriteSong(input: SetFavoriteSongInput): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  // Vérifier que le morceau appartient à l'utilisateur
  const { data: song } = await supabase
    .from("songs")
    .select("id")
    .eq("id", input.song_id)
    .eq("user_id", user.id)
    .single();

  if (!song) {
    return { success: false, error: "Morceau non trouvé" };
  }

  // Upsert : remplace si position existante, sinon insère
  const { error } = await supabase
    .from("favorite_songs")
    .upsert({
      user_id: user.id,
      song_id: input.song_id,
      position: input.position,
    }, {
      onConflict: "user_id,position"
    });

  if (error) {
    console.error("Error setting favorite song:", error);
    return { success: false, error: "Erreur lors de l'ajout aux favoris" };
  }

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  return { success: true };
}

/**
 * Supprime un morceau favori par position
 * @param position - Position du morceau à supprimer (1-4)
 */
export async function removeFavoriteSong(position: number): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  const { error } = await supabase
    .from("favorite_songs")
    .delete()
    .eq("user_id", user.id)
    .eq("position", position);

  if (error) {
    console.error("Error removing favorite song:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  return { success: true };
}

/**
 * Ajoute ou met à jour un album favori
 * @param input - Album et position (1-4)
 */
export async function setFavoriteAlbum(input: SetFavoriteAlbumInput): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  // Upsert : remplace si position existante, sinon insère
  const { error } = await supabase
    .from("favorite_albums")
    .upsert({
      user_id: user.id,
      ...input,
    }, {
      onConflict: "user_id,position"
    });

  if (error) {
    console.error("Error setting favorite album:", error);
    return { success: false, error: "Erreur lors de l'ajout aux favoris" };
  }

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  return { success: true };
}

/**
 * Supprime un album favori par position
 * @param position - Position de l'album à supprimer (1-4)
 */
export async function removeFavoriteAlbum(position: number): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  const { error } = await supabase
    .from("favorite_albums")
    .delete()
    .eq("user_id", user.id)
    .eq("position", position);

  if (error) {
    console.error("Error removing favorite album:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  return { success: true };
}
