"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { PROFILE_INSTRUMENTS_SELECT } from "@/lib/instruments";
import type {
  UserProfile,
  PublicProfile,
  UpdateProfileInput,
  SetFavoriteSongInput,
  SetFavoriteAlbumInput,
  Profile,
  FavoriteSong,
  FavoriteAlbum,
  FavoriteGear,
  GearItem,
  Song,
  WishlistSong,
  PlaylistWithSongs,
  AlbumReview,
  PracticeSessionWithSong,
  CoverWithSong,
} from "@/types";

/**
 * Upload un avatar pour l'utilisateur connecté
 * @param file - Le fichier image à uploader
 * @returns L'URL publique de l'avatar ou une erreur
 */
export async function uploadAvatar(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

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
  const user = await getAuthenticatedUser();

  if (!user) return null;

  // Récupérer le profil
  const { data: profile } = await supabase
    .from("profiles")
    .select(`*, ${PROFILE_INSTRUMENTS_SELECT}`)
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

  // Récupérer le matériel favori
  const { data: favoriteGear } = await supabase
    .from("favorite_gear")
    .select(`
      id,
      user_id,
      gear_id,
      position,
      created_at,
      gear:gear_items!gear_id(*)
    `)
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

  // Mapper les favorite gear pour convertir gear de tableau à objet
  const mappedFavoriteGear = (favoriteGear || []).map((fg: any) => ({
    ...fg,
    gear: Array.isArray(fg.gear) ? fg.gear[0] : fg.gear,
  }));

  return {
    ...(profile as Profile),
    favorite_songs: mappedFavoriteSongs as FavoriteSong[],
    favorite_albums: (favoriteAlbums || []) as FavoriteAlbum[],
    favorite_gear: mappedFavoriteGear as FavoriteGear[],
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
  const user = await getAuthenticatedUser();

  // Récupérer le profil de base
  const { data: profile } = await supabase
    .from("profiles")
    .select(`*, ${PROFILE_INSTRUMENTS_SELECT}`)
    .eq("id", userId)
    .single();

  if (!profile) return null;

  const isOwner = user?.id === userId;

  // Vérifier le statut d'amitié
  let isFriend = false;
  let friendshipStatus: 'none' | 'self' | 'pending' | 'accepted' | 'blocked' = 'none';
  let friendshipId: string | null = null;
  let requestIncoming = false;

  if (user && !isOwner) {
    const { data: friendship } = await supabase
      .from("friendships")
      .select("id, status, requester_id")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`)
      .maybeSingle();

    if (friendship) {
      friendshipStatus = friendship.status;
      isFriend = friendship.status === 'accepted';
      friendshipId = friendship.id;
      requestIncoming = friendship.requester_id === userId;
    }
  } else if (isOwner) {
    friendshipStatus = 'self';
  }

  // Déterminer si on peut voir le contenu privé
  const canViewPrivateContent = isOwner || !profile.is_private || isFriend;

  // Initialiser les données conditionnelles
  let favoriteSongs: FavoriteSong[] | null = null;
  let favoriteAlbums: FavoriteAlbum[] | null = null;
  let favoriteGearItems: FavoriteGear[] | null = null;
  let gearItems: GearItem[] | null = null;
  let recentSongs: Song[] | null = null;
  let allSongs: Song[] | null = null;
  let wishlist: WishlistSong[] | null = null;
  let playlists: PlaylistWithSongs[] | null = null;
  let albumReviews: AlbumReview[] | null = null;
  let practiceStats = null;
  let recentSessions: PracticeSessionWithSong[] | null = null;
  let totalSongs: number | null = null;
  let masteredSongs: number | null = null;
  let totalAlbumReviews = 0;

  if (canViewPrivateContent) {
    const [
      favSongsData,
      favAlbumsData,
      favGearData,
      gearItemsData,
      allSongsData,
      recentSongsData,
      songsCountData,
      masteredCountData,
      wishlistData,
      playlistsData,
      albumReviewsData,
      sessionsData,
      recentSessionsData,
    ] = await Promise.all([
      supabase
        .from("favorite_songs")
        .select(`id, user_id, song_id, position, created_at, song:songs(*)`)
        .eq("user_id", userId)
        .order("position"),
      supabase
        .from("favorite_albums")
        .select("*")
        .eq("user_id", userId)
        .order("position"),
      supabase
        .from("favorite_gear")
        .select(`id, user_id, gear_id, position, created_at, gear:gear_items!gear_id(*)`)
        .eq("user_id", userId)
        .order("position"),
      supabase
        .from("gear_items")
        .select("*")
        .eq("user_id", userId)
        .in("visibility", isOwner ? ["private", "friends", "public"] : isFriend ? ["friends", "public"] : ["public"])
        .order("created_at", { ascending: false }),
      supabase
        .from("songs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
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
      supabase
        .from("wishlist_songs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("playlists")
        .select(`*, playlist_songs(*, song:songs(*))`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("album_reviews")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("practice_sessions")
        .select("duration_minutes, practiced_at")
        .eq("user_id", userId)
        .order("practiced_at", { ascending: false }),
      supabase
        .from("practice_sessions")
        .select(`*, song:songs(*)`)
        .eq("user_id", userId)
        .order("practiced_at", { ascending: false })
        .limit(5),
    ]);

    // Mapper les favorite songs
    const mappedFavSongs = (favSongsData.data || []).map((fs: any) => ({
      ...fs,
      song: Array.isArray(fs.song) ? fs.song[0] : fs.song,
    }));

    favoriteSongs = mappedFavSongs as FavoriteSong[];
    favoriteAlbums = (favAlbumsData.data as FavoriteAlbum[]) || [];

    // Mapper les favorite gear
    const mappedFavGear = (favGearData.data || []).map((fg: any) => ({
      ...fg,
      gear: Array.isArray(fg.gear) ? fg.gear[0] : fg.gear,
    }));
    favoriteGearItems = mappedFavGear as FavoriteGear[];
    gearItems = (gearItemsData.data as GearItem[]) || [];

    allSongs = (allSongsData.data as Song[]) || [];
    recentSongs = (recentSongsData.data as Song[]) || [];
    totalSongs = songsCountData.count || 0;
    masteredSongs = masteredCountData.count || 0;
    wishlist = (wishlistData.data as WishlistSong[]) || [];
    albumReviews = (albumReviewsData.data as AlbumReview[]) || [];
    totalAlbumReviews = albumReviews.length;

    // Map playlists with song count
    playlists = (playlistsData.data || []).map((pl: any) => {
      const songs = (pl.playlist_songs || [])
        .sort((a: any, b: any) => a.position - b.position)
        .map((ps: any) => (Array.isArray(ps.song) ? ps.song[0] : ps.song))
        .filter(Boolean);
      return { ...pl, songs, song_count: songs.length, playlist_songs: undefined };
    }) as PlaylistWithSongs[];

    // Map recent sessions
    recentSessions = (recentSessionsData.data || []).map((s: any) => ({
      ...s,
      song: Array.isArray(s.song) ? s.song[0] : s.song,
    })) as PracticeSessionWithSong[];

    // Compute practice stats (streak + totals)
    const sessions = sessionsData.data || [];
    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);

    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const minutesThisWeek = sessions
      .filter((s: any) => new Date(s.practiced_at) >= startOfWeek)
      .reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);

    // Streak calculation
    const uniqueDays = [...new Set(
      sessions.map((s: any) => new Date(s.practiced_at).toDateString())
    )].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < uniqueDays.length; i++) {
      const dayDate = new Date(uniqueDays[i]);
      dayDate.setHours(0, 0, 0, 0);

      if (i === 0) {
        const diffDays = Math.floor((today.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 1) {
          currentStreak = 1;
        } else {
          break;
        }
      } else {
        const prevDate = new Date(uniqueDays[i - 1]);
        prevDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((prevDate.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    practiceStats = { currentStreak, totalSessions, totalMinutes, minutesThisWeek };
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
      id, user_id, song_id, media_url, media_type, thumbnail_url,
      duration_seconds, file_size_bytes, visibility, description, created_at,
      song:songs(*)
    `, { count: "exact" })
    .eq("user_id", userId)
    .in("visibility", coversFilter)
    .order("created_at", { ascending: false });

  // Mapper les covers
  const mappedCovers = (covers || []).map((cover: any) => ({
    ...cover,
    song: Array.isArray(cover.song) ? cover.song[0] : cover.song,
  })) as CoverWithSong[];

  return {
    profile: profile as Profile,
    favorite_songs: favoriteSongs,
    favorite_albums: favoriteAlbums,
    favorite_gear: favoriteGearItems,
    gear_items: gearItems,
    recent_songs: recentSongs,
    recent_covers: mappedCovers,
    all_songs: allSongs,
    wishlist,
    playlists,
    album_reviews: albumReviews,
    practice_stats: practiceStats,
    recent_sessions: recentSessions,
    stats: {
      totalSongs,
      masteredSongs,
      totalCovers: coversCount || 0,
      totalAlbumReviews,
    },
    friendship_status: friendshipStatus,
    friendship_id: friendshipId,
    request_incoming: requestIncoming,
    is_friend: isFriend,
  };
}

/**
 * Le profil public d'apres le pseudo, pour la page /commu/amis/[username].
 * Une adresse lisible et partageable, plutot qu'un identifiant.
 */
export async function getPublicProfileByUsername(username: string): Promise<PublicProfile | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (!data) return null;
  return getPublicProfile(data.id);
}

/**
 * Met à jour le profil de l'utilisateur connecté
 * @param input - Champs à mettre à jour
 */
export async function updateProfile(input: UpdateProfileInput): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

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
  const user = await getAuthenticatedUser();

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
  const user = await getAuthenticatedUser();

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
  const user = await getAuthenticatedUser();

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
  const user = await getAuthenticatedUser();

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
