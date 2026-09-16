/**
 * Lecture des URL Songsterr, cote client comme cote serveur.
 *
 * `lib/services/songsterr.ts` fait la meme chose, mais il embarque le
 * parseur de fichiers Guitar Pro et son `require("zlib")` : l'importer
 * depuis un composant client tirerait tout Node dans le bundle. Ces deux
 * fonctions-la sont de simples expressions regulieres, elles vivent ici.
 */

/**
 * L'identifiant d'un morceau dans une URL Songsterr.
 *
 * Deux formes circulent :
 *   https://www.songsterr.com/a/wsa/tool-stinkfist-tab-s19811
 *   https://www.songsterr.com/a/wsa/19811
 */
export function extractSongsterrId(url: string): number | null {
  if (!url) return null;

  const suffixed = url.match(/songsterr\.com\/a\/wsa\/.*?(\d+)(?:$|[?#])/);
  if (suffixed) return parseInt(suffixed[1], 10);

  const bare = url.match(/songsterr\.com\/a\/wsa\/(\d+)/);
  if (bare) return parseInt(bare[1], 10);

  return null;
}

export function getSongsterrUrl(songId: number): string {
  return `https://www.songsterr.com/a/wsa/${songId}`;
}

/** Une URL de tablature pointe-t-elle sur Songsterr ? */
export function isSongsterrUrl(url: string | null | undefined): boolean {
  return Boolean(url && url.includes("songsterr.com"));
}
