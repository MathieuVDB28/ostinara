"use server";

import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type {
  Profile,
  SearchResult,
  SearchResultGroup,
  SearchResultKind,
} from "@/types";

/**
 * Une recherche, tous les ecrans.
 *
 * BiblioSearchProvider etait le bon modele mais il s'arretait a /biblio :
 * pour retrouver une cover on ouvrait Biblio > Covers, pour un ampli
 * Profil > Matos, pour un ami Commu > Amis. Ici, un seul endroit
 * clairement identifie — cmd-K sur desktop, l'onglet Recherche sur
 * mobile — et des liens qui ouvrent la fiche, pas juste l'ecran.
 *
 * Tout passe par les politiques RLS de Supabase : cette fonction ne voit
 * que ce que l'utilisateur voit deja ailleurs.
 */

/** En deca de deux caracteres, une recherche ramene toute la base. */
const MIN_QUERY_LENGTH = 2;

/** Assez pour reconnaitre le bon resultat, trop peu pour avoir a defiler. */
const PER_KIND_LIMIT = 5;

const GROUP_LABELS: Record<SearchResultKind, string> = {
  song: "Morceaux",
  album: "Albums",
  cover: "Covers",
  exercise: "Exercices",
  gear: "Matos",
  friend: "Amis",
};

/**
 * L'ordre des groupes suit la frequence d'usage, pas l'alphabet : on
 * cherche un morceau cent fois pour un ampli une fois.
 */
const GROUP_ORDER: SearchResultKind[] = [
  "song",
  "album",
  "cover",
  "exercise",
  "gear",
  "friend",
];

/**
 * PostgREST interprete la virgule et la parenthese dans un `or()`. Un
 * titre comme « Sultans of Swing (live) » casserait le filtre — et,
 * au-dela du bug, c'est une injection de filtre.
 */
function escapeForFilter(value: string): string {
  return value.replace(/[(),*\\]/g, " ").trim();
}

function ilike(columns: string[], term: string): string {
  return columns.map((column) => `${column}.ilike.%${term}%`).join(",");
}

export async function searchEverything(
  rawQuery: string
): Promise<SearchResultGroup[]> {
  const query = escapeForFilter(rawQuery);

  if (query.length < MIN_QUERY_LENGTH) {
    return [];
  }

  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  const [songs, reviews, wishlist, covers, gear, exercises, friendships] =
    await Promise.all([
      supabase
        .from("songs")
        .select("id, title, artist, cover_url, status")
        .eq("user_id", user.id)
        .or(ilike(["title", "artist"], query))
        .limit(PER_KIND_LIMIT),

      supabase
        .from("album_reviews")
        .select("id, album_name, artist_name, cover_url, rating")
        .eq("user_id", user.id)
        .or(ilike(["album_name", "artist_name"], query))
        .limit(PER_KIND_LIMIT),

      supabase
        .from("album_wishlist")
        .select("id, album_name, artist_name, cover_url")
        .eq("user_id", user.id)
        .or(ilike(["album_name", "artist_name"], query))
        .limit(PER_KIND_LIMIT),

      supabase
        .from("covers")
        .select("id, description, thumbnail_url, created_at, song:songs(title, artist)")
        .eq("user_id", user.id)
        .limit(50),

      supabase
        .from("gear_items")
        .select("id, brand, model, type, image_url")
        .eq("user_id", user.id)
        .or(ilike(["brand", "model"], query))
        .limit(PER_KIND_LIMIT),

      supabase
        .from("exercises")
        .select("id, name, category, difficulty")
        .or(ilike(["name", "description"], query))
        .limit(PER_KIND_LIMIT),

      supabase
        .from("friendships")
        .select(
          `
          id,
          requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_url),
          addressee:profiles!friendships_addressee_id_fkey(id, username, display_name, avatar_url)
        `
        )
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .limit(100),
    ]);

  const byKind: Record<SearchResultKind, SearchResult[]> = {
    song: [],
    album: [],
    cover: [],
    exercise: [],
    gear: [],
    friend: [],
  };

  for (const song of songs.data ?? []) {
    byKind.song.push({
      kind: "song",
      id: song.id,
      title: song.title,
      subtitle: song.artist ?? undefined,
      imageUrl: song.cover_url ?? undefined,
      icon: "music_note",
      // Le lien ouvre la fiche du morceau, pas la bibliotheque entiere.
      href: `/biblio?song=${song.id}`,
    });
  }

  for (const review of reviews.data ?? []) {
    byKind.album.push({
      kind: "album",
      id: review.id,
      title: review.album_name,
      subtitle: `${review.artist_name} · noté ${review.rating / 2}/5`,
      imageUrl: review.cover_url ?? undefined,
      icon: "album",
      // Les albums n'ont pas de fiche propre : on arrive sur le segment,
      // deja filtre sur le nom cherche.
      href: `/biblio/albums?q=${encodeURIComponent(review.album_name)}`,
    });
  }

  for (const item of wishlist.data ?? []) {
    // Un album note et le meme album en wishlist ne font qu'une ligne.
    if (byKind.album.some((result) => result.title === item.album_name)) continue;
    byKind.album.push({
      kind: "album",
      id: item.id,
      title: item.album_name,
      subtitle: `${item.artist_name} · à écouter`,
      imageUrl: item.cover_url ?? undefined,
      icon: "album",
      href: `/biblio/albums?q=${encodeURIComponent(item.album_name)}`,
    });
  }

  /*
   * Les covers se cherchent par le morceau qu'elles reprennent, et
   * PostgREST ne sait pas filtrer sur une table jointe dans un `or()`.
   * Le tri se fait donc ici : une bibliotheque de covers reste petite —
   * trois covers au plan gratuit, quelques dizaines au-dela.
   */
  const needle = query.toLowerCase();
  for (const cover of covers.data ?? []) {
    const song = cover.song as unknown as
      | { title: string; artist: string | null }
      | null;
    const haystack = [song?.title, song?.artist, cover.description]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (!haystack.includes(needle)) continue;
    if (byKind.cover.length >= PER_KIND_LIMIT) break;

    byKind.cover.push({
      kind: "cover",
      id: cover.id,
      title: song?.title ?? "Cover",
      subtitle:
        cover.description ||
        (song?.artist ? `Cover de ${song.artist}` : "Cover"),
      imageUrl: cover.thumbnail_url ?? undefined,
      icon: "videocam",
      href: `/biblio/covers?cover=${cover.id}`,
    });
  }

  for (const exercise of exercises.data ?? []) {
    byKind.exercise.push({
      kind: "exercise",
      id: exercise.id,
      title: exercise.name,
      subtitle: exercise.category ?? undefined,
      icon: "exercise",
      href: `/jouer?exercise=${exercise.id}`,
    });
  }

  for (const item of gear.data ?? []) {
    byKind.gear.push({
      kind: "gear",
      id: item.id,
      title: `${item.brand} ${item.model}`.trim(),
      subtitle: item.type ?? undefined,
      imageUrl: item.image_url ?? undefined,
      icon: "tune",
      href: `/profil/matos?gear=${item.id}`,
    });
  }

  for (const friendship of friendships.data ?? []) {
    const requester = friendship.requester as unknown as Profile;
    const addressee = friendship.addressee as unknown as Profile;
    const profile = requester?.id === user.id ? addressee : requester;
    if (!profile) continue;

    const name = profile.display_name || profile.username || "";
    if (!name.toLowerCase().includes(needle) &&
        !(profile.username ?? "").toLowerCase().includes(needle)) {
      continue;
    }
    if (byKind.friend.length >= PER_KIND_LIMIT) break;

    byKind.friend.push({
      kind: "friend",
      id: profile.id,
      title: name || profile.username,
      subtitle: profile.username ? `@${profile.username}` : undefined,
      imageUrl: profile.avatar_url ?? undefined,
      icon: "person",
      href: `/commu/amis?friend=${profile.id}`,
    });
  }

  return GROUP_ORDER.filter((kind) => byKind[kind].length > 0).map((kind) => ({
    kind,
    label: GROUP_LABELS[kind],
    results: byKind[kind],
  }));
}
