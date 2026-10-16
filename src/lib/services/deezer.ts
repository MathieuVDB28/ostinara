import type {
  CatalogAlbum,
  CatalogAlbumDetails,
  CatalogAlbumTrack,
  CatalogArtist,
  CatalogImage,
  CatalogTrack,
} from '@/types';

/**
 * Le catalogue musical : l'API publique de Deezer.
 *
 * Elle a remplace Spotify en octobre 2026 : depuis 2026, une app Spotify en
 * mode developpement exige un compte Premium chez son proprietaire et ne
 * sert que 5 utilisateurs. Deezer ne demande ni compte ni cle pour lire le
 * catalogue.
 *
 * Tout ce module rend des types `Catalog*`, jamais la forme brute de Deezer :
 * les ecrans ne savent pas d'ou vient la musique. Les identifiants Deezer
 * sont numeriques ; on les manipule en chaines, comme le faisait l'app.
 *
 * Deezer signale ses erreurs (quota depasse, objet introuvable) dans un
 * corps 200 `{ error: {...} }` : `get` les traite comme des echecs.
 */

const API = 'https://api.deezer.com';

/** Une journee pour ce qui ne bouge pas (album, artiste), rien pour la recherche. */
const DAY = 86400;

/**
 * Les editions qu'on ne choisit qu'a defaut : un coffret « Deluxe Box Set »
 * a soixante titres, un live n'est pas l'album.
 */
const SPECIAL_EDITION = /box set|deluxe|live|anniversary|expanded|demo|edition/gi;
const editionPenalty = (name: string) => name.match(SPECIAL_EDITION)?.length ?? 0;

interface DeezerError {
  error?: { type: string; message: string; code: number };
}

async function get<T>(path: string, revalidate = 0): Promise<T | null> {
  try {
    const response = await fetch(`${API}${path}`, revalidate ? { next: { revalidate } } : { cache: 'no-store' });
    if (!response.ok) {
      console.error(`[deezer] ${path} -> HTTP ${response.status}`);
      return null;
    }
    const data = (await response.json()) as T & DeezerError;
    if (data.error) {
      console.error(`[deezer] ${path} -> ${data.error.type}: ${data.error.message}`);
      return null;
    }
    return data;
  } catch (error) {
    console.error(`[deezer] ${path} failed:`, error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Formes brutes (seulement les champs lus)
// ---------------------------------------------------------------------------

interface RawArtist {
  id: number;
  name: string;
  link?: string;
  picture_medium?: string;
  picture_big?: string;
  picture_xl?: string;
  nb_fan?: number;
  nb_album?: number;
}

interface RawAlbum {
  id: number;
  title: string;
  link?: string;
  cover_medium?: string;
  cover_big?: string;
  cover_xl?: string;
  release_date?: string;
  nb_tracks?: number;
  record_type?: string;
  fans?: number;
  label?: string;
  genres?: { data: { name: string }[] };
  artist?: RawArtist;
  contributors?: RawArtist[];
}

interface RawTrack {
  id: number;
  title: string;
  link?: string;
  duration: number;
  preview?: string;
  track_position?: number;
  disk_number?: number;
  bpm?: number;
  artist: RawArtist;
  album?: RawAlbum;
  contributors?: RawArtist[];
}

interface List<T> {
  data: T[];
  total?: number;
  next?: string;
}

// ---------------------------------------------------------------------------
// Conversions
// ---------------------------------------------------------------------------

/** Les pochettes, de la plus grande a la plus petite — comme Spotify. */
function covers(album?: Pick<RawAlbum, 'cover_xl' | 'cover_big' | 'cover_medium'>): CatalogImage[] {
  if (!album) return [];
  return [
    album.cover_xl && { url: album.cover_xl, width: 1000, height: 1000 },
    album.cover_big && { url: album.cover_big, width: 500, height: 500 },
    album.cover_medium && { url: album.cover_medium, width: 250, height: 250 },
  ].filter(Boolean) as CatalogImage[];
}

function pictures(artist: RawArtist): CatalogImage[] {
  return [
    artist.picture_xl && { url: artist.picture_xl, width: 1000, height: 1000 },
    artist.picture_big && { url: artist.picture_big, width: 500, height: 500 },
    artist.picture_medium && { url: artist.picture_medium, width: 250, height: 250 },
  ].filter(Boolean) as CatalogImage[];
}

/** Les artistes d'un titre ou d'un album : l'artiste principal, puis les invites. */
function artistsOf(main?: RawArtist, contributors?: RawArtist[]) {
  const all = [main, ...(contributors ?? [])].filter(Boolean) as RawArtist[];
  const seen = new Set<number>();
  return all
    .filter((artist) => (seen.has(artist.id) ? false : (seen.add(artist.id), true)))
    .map((artist) => ({ id: String(artist.id), name: artist.name }));
}

function toAlbum(raw: RawAlbum, fallbackArtist?: RawArtist): CatalogAlbum {
  return {
    id: String(raw.id),
    name: raw.title,
    artists: artistsOf(raw.artist ?? fallbackArtist, raw.contributors),
    images: covers(raw),
    url: raw.link ?? `https://www.deezer.com/album/${raw.id}`,
    release_date: raw.release_date ?? '',
    total_tracks: raw.nb_tracks ?? 0,
    record_type: raw.record_type,
    fans: raw.fans,
  };
}

function toTrack(raw: RawTrack): CatalogTrack {
  return {
    id: String(raw.id),
    name: raw.title,
    artists: artistsOf(raw.artist, raw.contributors),
    album: {
      id: raw.album ? String(raw.album.id) : '',
      name: raw.album?.title ?? '',
      images: covers(raw.album),
    },
    duration_ms: raw.duration * 1000,
    preview_url: raw.preview || null,
    url: raw.link ?? `https://www.deezer.com/track/${raw.id}`,
  };
}

function toArtist(raw: RawArtist): CatalogArtist {
  return {
    id: String(raw.id),
    name: raw.name,
    images: pictures(raw),
    fans: raw.nb_fan ?? 0,
    album_count: raw.nb_album ?? 0,
    url: raw.link ?? `https://www.deezer.com/artist/${raw.id}`,
  };
}

// ---------------------------------------------------------------------------
// Recherche
// ---------------------------------------------------------------------------

export async function searchTracks(query: string, limit = 10): Promise<CatalogTrack[]> {
  if (!query.trim()) return [];
  const data = await get<List<RawTrack>>(`/search/track?q=${encodeURIComponent(query)}&limit=${limit}`);
  return (data?.data ?? []).map(toTrack);
}

export async function searchAlbums(query: string, limit = 10): Promise<CatalogAlbum[]> {
  if (!query.trim()) return [];
  const data = await get<List<RawAlbum>>(`/search/album?q=${encodeURIComponent(query)}&limit=${limit}`);
  return (data?.data ?? []).map((album) => toAlbum(album));
}

export async function searchArtists(query: string, limit = 5): Promise<CatalogArtist[]> {
  if (!query.trim()) return [];
  const data = await get<List<RawArtist>>(`/search/artist?q=${encodeURIComponent(query)}&limit=${limit}`);
  return (data?.data ?? []).map(toArtist);
}

/** Un morceau pret a entrer dans la biblio. */
export function formatTrackForSong(track: CatalogTrack) {
  return {
    id: track.id,
    title: track.name,
    artist: track.artists.map((artist) => artist.name).join(', '),
    album: track.album.name,
    cover_url: track.album.images[0]?.url,
    deezer_id: track.id,
    preview_url: track.preview_url,
  };
}

// ---------------------------------------------------------------------------
// Fiches
// ---------------------------------------------------------------------------

/**
 * Un album et sa tracklist.
 *
 * La fiche /album/{id} embarque des titres sans numero de piste ni de
 * disque : la tracklist vient de /album/{id}/tracks, qui les donne.
 */
export async function getAlbumDetails(albumId: string): Promise<CatalogAlbumDetails | null> {
  if (!/^\d+$/.test(albumId)) return null;
  const [raw, tracks] = await Promise.all([
    get<RawAlbum>(`/album/${albumId}`, DAY),
    get<List<RawTrack>>(`/album/${albumId}/tracks?limit=200`, DAY),
  ]);
  if (!raw) return null;

  const items: CatalogAlbumTrack[] = (tracks?.data ?? []).map((track, index) => ({
    id: String(track.id),
    name: track.title,
    track_number: track.track_position ?? index + 1,
    disc_number: track.disk_number ?? 1,
    duration_ms: track.duration * 1000,
    preview_url: track.preview || null,
  }));

  return {
    ...toAlbum(raw),
    label: raw.label,
    genres: (raw.genres?.data ?? []).map((genre) => genre.name),
    tracks: { items },
  };
}

export async function getArtistDetails(artistId: string): Promise<CatalogArtist | null> {
  if (!/^\d+$/.test(artistId)) return null;
  const raw = await get<RawArtist>(`/artist/${artistId}`, DAY);
  return raw ? toArtist(raw) : null;
}

/**
 * La discographie : albums et EP, sans singles, les plus ecoutes d'abord.
 *
 * Pas de tri par date : Deezer date chaque edition a sa sortie, un remaster
 * de « Sabbath Bloody Sabbath » (1973) est « 2026 ». Les reeditions du meme
 * album (« Remastered », « Deluxe ») n'en font qu'une : la plus simple.
 */
export async function getArtistAlbums(artistId: string, artist?: { name: string }): Promise<CatalogAlbum[]> {
  const data = await get<List<RawAlbum>>(`/artist/${artistId}/albums?limit=100`, DAY);
  const fallback = artist ? ({ id: Number(artistId), name: artist.name } as RawArtist) : undefined;

  // Les fans de toutes les editions d'un album s'additionnent : c'est sa
  // popularite, quelle que soit l'edition qu'on garde.
  const editions = new Map<string, CatalogAlbum>();
  const fans = new Map<string, number>();
  for (const raw of data?.data ?? []) {
    if (raw.record_type !== 'album' && raw.record_type !== 'ep') continue;
    const album = toAlbum(raw, fallback);
    const key = normalize(album.name);
    const kept = editions.get(key);
    if (!kept || editionPenalty(album.name) < editionPenalty(kept.name)) editions.set(key, album);
    fans.set(key, (fans.get(key) ?? 0) + (album.fans ?? 0));
  }
  return [...editions.entries()]
    .map(([key, album]) => ({ ...album, fans: fans.get(key) ?? album.fans }))
    .sort((a, b) => (b.fans ?? 0) - (a.fans ?? 0));
}

/** Les artistes proches, selon Deezer — la base des recommandations. */
export async function getRelatedArtists(artistId: string, limit = 8): Promise<CatalogArtist[]> {
  const data = await get<List<RawArtist>>(`/artist/${artistId}/related?limit=${limit}`, DAY);
  return (data?.data ?? []).map(toArtist);
}

// ---------------------------------------------------------------------------
// Retrouver une oeuvre connue par son nom
// ---------------------------------------------------------------------------

/** Le titre sans « (Remastered) » ni « - Live » : Deezer ne trouve rien avec. */
function clean(value: string): string {
  return value.replace(/\s*[([].*?[)\]]\s*/g, ' ').replace(/\s+-\s+.*$/, '').trim();
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s*[([].*?[)\]]\s*/g, ' ')
    .replace(/\s+-\s+.*$/, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Le meilleur candidat : meme artiste, meme titre (ou un titre qui le
 * prolonge), et parmi eux l'edition la plus simple.
 */
function pickByName<T extends { name: string; artists: { name: string }[] }>(
  pool: T[],
  name: string,
  artist: string
): T | null {
  const wantedArtist = normalize(artist.split(',')[0]);
  const wantedName = normalize(name);
  const sameArtist = pool.filter((item) =>
    item.artists.some((candidate) => normalize(candidate.name) === wantedArtist)
  );
  const simplest = (items: T[]) =>
    items.reduce<T | null>(
      (best, item) => (!best || editionPenalty(item.name) < editionPenalty(best.name) ? item : best),
      null
    );
  return (
    simplest(sameArtist.filter((item) => normalize(item.name) === wantedName)) ??
    simplest(
      sameArtist.filter((item) => {
        const candidate = normalize(item.name);
        return candidate.startsWith(wantedName) || wantedName.startsWith(candidate);
      })
    )
  );
}

/**
 * L'album Deezer qui correspond a un titre et un artiste — pour les albums
 * enregistres du temps de Spotify, et les liens /albums/<id Spotify>.
 *
 * Trois essais, du plus fiable au plus large. La recherche libre d'abord :
 * la recherche stricte (`artist:"…" album:"…"`) de Deezer remonte surtout
 * des reprises d'autres artistes. Puis la stricte, puis la discographie de
 * l'artiste — utile pour un album eponyme (« Metallica » de Metallica).
 */
export async function findAlbum(name: string, artist: string): Promise<CatalogAlbum | null> {
  const mainArtist = artist.split(',')[0].trim();
  const title = clean(name);

  // Une edition standard trouvee par la recherche suffit ; sinon on compare
  // avec la discographie, qui a souvent l'edition simple.
  const loose = pickByName(await searchAlbums(`${mainArtist} ${title}`, 15), name, artist);
  if (loose && editionPenalty(loose.name) === 0) return loose;

  const [found] = await searchArtists(mainArtist, 1);
  const fromDiscography =
    found && normalize(found.name) === normalize(mainArtist)
      ? pickByName(await getArtistAlbums(found.id, found), name, artist)
      : null;

  const best = [loose, fromDiscography]
    .filter((album): album is CatalogAlbum => album !== null)
    .sort((a, b) => editionPenalty(a.name) - editionPenalty(b.name))[0];
  if (best) return best;

  return pickByName(await searchAlbums(`artist:"${mainArtist}" album:"${title}"`, 15), name, artist);
}

/** Le titre Deezer qui correspond a un titre et un artiste. */
export async function findTrack(title: string, artist: string): Promise<CatalogTrack | null> {
  const mainArtist = artist.split(',')[0].trim();
  const loose = pickByName(await searchTracks(`${mainArtist} ${clean(title)}`, 15), title, artist);
  if (loose) return loose;
  return pickByName(await searchTracks(`artist:"${mainArtist}" track:"${clean(title)}"`, 15), title, artist);
}

/**
 * Le tempo d'un titre selon Deezer, ou null s'il ne le connait pas (il
 * repond 0 pour un titre sur deux). Calcule par analyse du son, il double
 * parfois : 190 pour « Back In Black », qui est a 94.
 */
export async function getTrackBpm(trackId: string): Promise<number | null> {
  if (!/^\d+$/.test(trackId)) return null;
  const raw = await get<RawTrack>(`/track/${trackId}`, DAY);
  return raw?.bpm && raw.bpm > 0 ? Math.round(raw.bpm) : null;
}

/** Le lien d'ecoute d'un album ou d'un titre Deezer. */
export function deezerUrl(kind: 'album' | 'track' | 'artist', id: string): string {
  return `https://www.deezer.com/${kind}/${id}`;
}
