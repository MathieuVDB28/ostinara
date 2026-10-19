/**
 * Les mentions @pseudo du forum, cote client et serveur.
 *
 * Un pseudo mentionnable : lettres, chiffres, « _ », « . » et « - », sans
 * finir par « . » ou « - » (« merci @lea. » mentionne lea). Les pseudos
 * avec espaces ou accents (aucun format n'est impose a l'inscription) ne
 * se mentionnent pas.
 */

/** Une mention dans un texte : precedee d'un debut de ligne ou d'un blanc / signe. */
export const MENTION_PATTERN = /(^|[^\w@./-])@([A-Za-z0-9_](?:[A-Za-z0-9_.-]{0,38}[A-Za-z0-9_])?)/g;

/** Au plus 10 personnes prevenues par message : au-dela, c'est du bruit. */
export const MAX_MENTIONS = 10;

/** Les pseudos mentionnes dans un texte, sans doublon, dans l'ordre. */
export function extractMentions(text: string): string[] {
  const names: string[] = [];
  for (const match of text.matchAll(MENTION_PATTERN)) {
    const name = match[2];
    if (!names.some((known) => known.toLowerCase() === name.toLowerCase())) names.push(name);
    if (names.length >= MAX_MENTIONS) break;
  }
  return names;
}

/** Le pseudo en cours de frappe juste avant le curseur (« @le| » → « le »), sinon null. */
export function mentionQueryAt(text: string, caret: number): { query: string; start: number } | null {
  const before = text.slice(0, caret);
  const match = before.match(/(^|[^\w@./-])@([A-Za-z0-9_.-]{0,40})$/);
  if (!match) return null;
  return { query: match[2], start: caret - match[2].length - 1 };
}
