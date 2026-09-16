"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { createActivity } from "./activities";
import type {
  Cover,
  CoverFeedItem,
  CoverWithSong,
  CreateCoverInput,
  Profile,
  ReactionSummary,
  Song,
  UpdateCoverInput,
} from "@/types";

const FREE_PLAN_COVER_LIMIT = 3;

export async function getCovers(): Promise<CoverWithSong[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("covers")
    .select(`
      *,
      song:songs(*)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching covers:", error);
    return [];
  }

  return data as CoverWithSong[];
}

export async function getCoversBySong(songId: string): Promise<Cover[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("covers")
    .select("*")
    .eq("song_id", songId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching covers:", error);
    return [];
  }

  return data as Cover[];
}

export async function canUploadCover(): Promise<{
  allowed: boolean;
  reason?: string;
  limit?: number;
  current?: number
}> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

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

  const { count } = await supabase
    .from("covers")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const currentCount = count || 0;

  if (currentCount >= FREE_PLAN_COVER_LIMIT) {
    return {
      allowed: false,
      reason: `Tu as atteint la limite de ${FREE_PLAN_COVER_LIMIT} covers. Passe en Pro pour en ajouter plus !`,
      limit: FREE_PLAN_COVER_LIMIT,
      current: currentCount
    };
  }

  return { allowed: true, limit: FREE_PLAN_COVER_LIMIT, current: currentCount };
}

export async function createCover(input: CreateCoverInput): Promise<{
  success: boolean;
  error?: string;
  cover?: Cover
}> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  // Vérifier la limite du plan
  const uploadCheck = await canUploadCover();
  if (!uploadCheck.allowed) {
    return { success: false, error: uploadCheck.reason };
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

  /*
   * Une reponse en cover est une cover comme une autre : meme table, un
   * lien de parente en plus. On verifie que l'originale est bien visible
   * par l'auteur de la reponse — sinon n'importe quel identifiant
   * permettrait de s'accrocher a n'importe quelle publication.
   */
  let replyTo: string | null = null;
  if (input.reply_to_cover_id) {
    const { data: parent } = await supabase
      .from("covers")
      .select("id")
      .eq("id", input.reply_to_cover_id)
      .maybeSingle();
    if (!parent) {
      return { success: false, error: "Cover d'origine introuvable" };
    }
    replyTo = parent.id;
  }

  const { data, error } = await supabase
    .from("covers")
    .insert({
      ...input,
      reply_to_cover_id: replyTo,
      user_id: user.id,
      visibility: input.visibility || "friends",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating cover:", error);
    return { success: false, error: "Erreur lors de l'ajout du cover" };
  }

  // Créer une activité si le cover est visible par les amis ou public
  const visibility = input.visibility || "friends";
  if (visibility !== "private") {
    await createActivity({
      type: "cover_posted",
      reference_id: data.id,
      metadata: { visibility },
    });
    revalidatePath("/feed");
  }

  revalidatePath("/covers");
  revalidatePath("/biblio/covers");
  revalidatePath("/commu/covers");
  revalidatePath("/library");
  return { success: true, cover: data as Cover };
}

export async function updateCover(
  id: string,
  input: UpdateCoverInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  const { error } = await supabase
    .from("covers")
    .update(input)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating cover:", error);
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath("/covers");
  return { success: true };
}

export async function deleteCover(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  // Récupérer le cover pour supprimer les fichiers storage
  const { data: cover } = await supabase
    .from("covers")
    .select("media_url, thumbnail_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!cover) {
    return { success: false, error: "Cover non trouvé" };
  }

  // Supprimer de la base de données
  const { error } = await supabase
    .from("covers")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting cover:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }

  // Supprimer les fichiers du storage
  try {
    const mediaPath = extractStoragePath(cover.media_url);
    if (mediaPath) {
      await supabase.storage.from("covers").remove([mediaPath]);
    }
    if (cover.thumbnail_url) {
      const thumbPath = extractStoragePath(cover.thumbnail_url);
      if (thumbPath) {
        await supabase.storage.from("covers").remove([thumbPath]);
      }
    }
  } catch (e) {
    console.error("Error deleting storage files:", e);
  }

  revalidatePath("/covers");
  revalidatePath("/library");
  return { success: true };
}

function extractStoragePath(url: string): string | null {
  // Extraire le chemin depuis l'URL Supabase Storage
  const match = url.match(/\/storage\/v1\/object\/public\/covers\/(.+)$/);
  return match ? match[1] : null;
}

/**
 * Le feed de covers.
 *
 * Les covers etaient rangees dans un sous-segment de la bibliotheque,
 * a cote des morceaux et des albums — c'est-a-dire parmi les objets
 * personnels, alors que c'est le seul contenu vraiment social de l'app.
 * Ici elles se lisent comme un feed : les tiennes et celles de tes amis,
 * dans l'ordre, avec la reaction a portee de pouce.
 *
 * Tout arrive en cinq requetes bornees, quel que soit le nombre de
 * covers : amis, covers, auteurs, reactions, reponses. Une requete par
 * cover serait un feed injouable a trente publications.
 */
export async function getCoversFeed(limit = 30): Promise<CoverFeedItem[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  const { data: friendships } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  const friendIds = (friendships || []).map((f) =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  );

  // Soi-meme en premier : un feed vide le jour ou l'on publie sa premiere
  // cover donnerait l'impression que rien n'a ete enregistre.
  const feedUserIds = [user.id, ...friendIds];

  const { data: covers, error } = await supabase
    .from("covers")
    .select("*, song:songs(*)")
    .in("user_id", feedUserIds)
    // Les covers privees restent privees, y compris les siennes : ce feed
    // est l'ecran du partage, la bibliotheque reste l'ecran de l'archive.
    .in("visibility", ["friends", "public"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching covers feed:", error);
    return [];
  }

  if (!covers || covers.length === 0) {
    return [];
  }

  const coverIds = covers.map((cover) => cover.id);
  const authorIds = [...new Set(covers.map((cover) => cover.user_id))];
  const parentIds = [
    ...new Set(
      covers
        .map((cover) => cover.reply_to_cover_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const [authorsResult, activitiesResult, parentsResult, repliesResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, plan")
        .in("id", authorIds),
      supabase
        .from("activities")
        .select("id, reference_id")
        .eq("type", "cover_posted")
        .in("reference_id", coverIds),
      parentIds.length > 0
        ? supabase
            .from("covers")
            .select("id, user_id, thumbnail_url, song:songs(title)")
            .in("id", parentIds)
        : Promise.resolve({ data: [] }),
      // Le nombre de reponses par cover : un compteur, pas les reponses.
      supabase
        .from("covers")
        .select("reply_to_cover_id")
        .in("reply_to_cover_id", coverIds),
    ]);

  const authors = new Map(
    (authorsResult.data ?? []).map((profile) => [profile.id, profile])
  );

  const activityByCover = new Map<string, string>(
    (activitiesResult.data ?? []).map((activity) => [
      activity.reference_id as string,
      activity.id as string,
    ])
  );

  const replyCounts = new Map<string, number>();
  for (const row of repliesResult.data ?? []) {
    const parentId = row.reply_to_cover_id as string | null;
    if (!parentId) continue;
    replyCounts.set(parentId, (replyCounts.get(parentId) ?? 0) + 1);
  }

  // Les reactions de toutes les activites du feed, en une lecture.
  const activityIds = [...activityByCover.values()];
  const reactionsByActivity = new Map<string, ReactionSummary[]>();
  const userReactionsByActivity = new Map<string, string[]>();
  const commentCountByActivity = new Map<string, number>();

  if (activityIds.length > 0) {
    const [reactionsResult, commentsResult] = await Promise.all([
      supabase
        .from("activity_reactions")
        .select("activity_id, user_id, emoji")
        .in("activity_id", activityIds),
      supabase
        .from("activity_comments")
        .select("activity_id")
        .in("activity_id", activityIds),
    ]);

    const grouped = new Map<string, Map<string, { count: number; reacted: boolean }>>();
    for (const reaction of reactionsResult.data ?? []) {
      const perActivity =
        grouped.get(reaction.activity_id) ??
        new Map<string, { count: number; reacted: boolean }>();
      const entry = perActivity.get(reaction.emoji) ?? { count: 0, reacted: false };
      entry.count += 1;
      if (reaction.user_id === user.id) {
        entry.reacted = true;
        userReactionsByActivity.set(reaction.activity_id, [
          ...(userReactionsByActivity.get(reaction.activity_id) ?? []),
          reaction.emoji,
        ]);
      }
      perActivity.set(reaction.emoji, entry);
      grouped.set(reaction.activity_id, perActivity);
    }

    for (const [activityId, perActivity] of grouped) {
      reactionsByActivity.set(
        activityId,
        [...perActivity.entries()]
          .map(([emoji, entry]) => ({ emoji, ...entry }))
          .sort((a, b) => b.count - a.count)
      );
    }

    for (const comment of commentsResult.data ?? []) {
      commentCountByActivity.set(
        comment.activity_id,
        (commentCountByActivity.get(comment.activity_id) ?? 0) + 1
      );
    }
  }

  type ParentRow = {
    id: string;
    user_id: string;
    thumbnail_url: string | null;
    song: { title: string } | { title: string }[] | null;
  };

  const parents = new Map<string, ParentRow>(
    ((parentsResult.data ?? []) as ParentRow[]).map((row) => [row.id, row])
  );

  return covers.map((cover) => {
    const activityId = activityByCover.get(cover.id) ?? null;
    const parent = cover.reply_to_cover_id
      ? parents.get(cover.reply_to_cover_id)
      : undefined;
    const parentAuthor = parent ? authors.get(parent.user_id) : undefined;
    // PostgREST rend la relation tantot comme objet, tantot comme tableau
    // selon la cardinalite qu'il infere : les deux formes sont possibles.
    const parentSong = Array.isArray(parent?.song) ? parent?.song[0] : parent?.song;

    return {
      ...(cover as CoverWithSong),
      author: (authors.get(cover.user_id) ?? {
        id: cover.user_id,
        username: "guitariste",
        display_name: undefined,
        avatar_url: undefined,
        plan: "free",
      }) as CoverFeedItem["author"],
      activityId,
      reactions: activityId ? reactionsByActivity.get(activityId) ?? [] : [],
      currentUserReactions: activityId
        ? userReactionsByActivity.get(activityId) ?? []
        : [],
      commentCount: activityId
        ? commentCountByActivity.get(activityId) ?? 0
        : 0,
      replyTo: parent
        ? {
            id: parent.id,
            authorName:
              parentAuthor?.display_name || parentAuthor?.username || "un ami",
            songTitle: parentSong?.title ?? "un morceau",
            thumbnailUrl: parent.thumbnail_url ?? undefined,
          }
        : null,
      replyCount: replyCounts.get(cover.id) ?? 0,
      isOwn: cover.user_id === user.id,
    } satisfies CoverFeedItem;
  });
}

/**
 * Une cover a laquelle on repond, avec son morceau.
 *
 * Sert a l'ecran de reponse : il faut montrer a quoi l'on repond, et le
 * morceau d'origine pre-selectionne la cible de la nouvelle cover.
 */
export async function getCoverForReply(
  coverId: string
): Promise<{ cover: CoverWithSong; author: Pick<Profile, "id" | "username" | "display_name"> } | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) return null;

  const { data: cover } = await supabase
    .from("covers")
    .select("*, song:songs(*)")
    .eq("id", coverId)
    .maybeSingle();

  if (!cover) return null;

  const { data: author } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("id", cover.user_id)
    .maybeSingle();

  return {
    cover: cover as CoverWithSong,
    author: (author ?? {
      id: cover.user_id,
      username: "guitariste",
    }) as Pick<Profile, "id" | "username" | "display_name">,
  };
}

/**
 * Le morceau a utiliser pour repondre a une cover.
 *
 * Une cover se rattache toujours a un morceau *de sa propre* bibliotheque
 * (`createCover` le verifie). Repondre suppose donc d'avoir le morceau :
 * s'il n'y est pas, on l'ajoute — c'est le geste attendu de toute facon.
 */
export async function ensureSongForCoverReply(
  coverId: string
): Promise<{ success: boolean; songId?: string; created?: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) return { success: false, error: "Non authentifié" };

  const { data: cover } = await supabase
    .from("covers")
    .select("song:songs(title, artist, album, cover_url, spotify_id)")
    .eq("id", coverId)
    .maybeSingle();

  const source = (Array.isArray(cover?.song) ? cover?.song[0] : cover?.song) as
    | Pick<Song, "title" | "artist" | "album" | "cover_url" | "spotify_id">
    | undefined;

  if (!source) {
    return { success: false, error: "Morceau d'origine introuvable" };
  }

  /*
   * Deja en bibliotheque ? On ne cree pas un doublon pour une reponse.
   *
   * `limit(1)` et non `maybeSingle()` : une bibliotheque peut contenir
   * deux entrees du meme titre — une version acoustique, un live — et
   * `maybeSingle()` leverait au lieu d'en choisir une.
   */
  const { data: existing } = await supabase
    .from("songs")
    .select("id")
    .eq("user_id", user.id)
    .ilike("title", source.title)
    .ilike("artist", source.artist)
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: true, songId: existing[0].id, created: false };
  }

  const { data: inserted, error } = await supabase
    .from("songs")
    .insert({
      user_id: user.id,
      title: source.title,
      artist: source.artist,
      album: source.album,
      cover_url: source.cover_url,
      spotify_id: source.spotify_id,
      status: "learning",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating song for cover reply:", error);
    return {
      success: false,
      error: "Impossible d'ajouter ce morceau à ta bibliothèque",
    };
  }

  revalidatePath("/biblio");
  return { success: true, songId: inserted.id, created: true };
}
