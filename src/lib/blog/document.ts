/**
 * Le document d'un article : le JSON de l'editeur (Tiptap / ProseMirror).
 *
 * On stocke le JSON, pas du HTML : l'app le rend elle-meme, noeud par noeud
 * (src/components/blog/blog-content.tsx), et ignore ce qu'elle ne connait
 * pas. Pas de HTML a assainir, et les blocs propres a Ostinara (morceau,
 * metronome) deviennent de vrais composants.
 *
 * Client et serveur.
 */

export interface BlogMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface BlogNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: BlogNode[];
  marks?: BlogMark[];
  text?: string;
}

export interface BlogDocument {
  type: "doc";
  content?: BlogNode[];
}

/** Les blocs Ostinara (noms des noeuds Tiptap). */
export const SONG_EMBED = "songEmbed";
export const METRONOME_EMBED = "metronomeEmbed";
export const EXERCISE_EMBED = "exerciseEmbed";

export interface SongEmbedAttrs {
  deezerId: string | null;
  title: string;
  artist: string;
  album: string | null;
  coverUrl: string | null;
  previewUrl: string | null;
}

/**
 * Un exercice systeme, recopie dans l'article au moment de l'inserer : la
 * page s'affiche sans requete, meme pour un visiteur. Le nom et la
 * description sont gardes dans les deux langues (exercises.translations).
 */
export interface ExerciseEmbedAttrs {
  exerciseId: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  category: string;
  difficulty: string;
  startingBpm: number;
  targetBpm: number;
  timeSignature: string;
  instruments: string[];
}

export interface MetronomeEmbedAttrs {
  bpm: number;
  beats: number;
}

export const EMPTY_DOCUMENT: BlogDocument = { type: "doc", content: [] };

/** Le document, ou un document vide si ce qu'on recoit n'en est pas un. */
export function asDocument(value: unknown): BlogDocument {
  if (value && typeof value === "object" && (value as BlogNode).type === "doc") {
    return value as BlogDocument;
  }
  return EMPTY_DOCUMENT;
}

const BLOCK_TYPES = new Set([
  "paragraph", "heading", "blockquote", "listItem", "codeBlock",
]);

/** Le texte brut du document : temps de lecture, recherche, extrait. */
export function documentText(doc: BlogDocument): string {
  const parts: string[] = [];
  const walk = (node: BlogNode) => {
    if (node.type === "text" && node.text) parts.push(node.text);
    if (node.type === SONG_EMBED) {
      const attrs = node.attrs as Partial<SongEmbedAttrs> | undefined;
      parts.push([attrs?.title, attrs?.artist].filter(Boolean).join(" - "));
    }
    if (node.type === EXERCISE_EMBED) {
      const attrs = node.attrs as Partial<ExerciseEmbedAttrs> | undefined;
      if (attrs?.name) parts.push(attrs.name);
    }
    node.content?.forEach(walk);
    if (BLOCK_TYPES.has(node.type)) parts.push("\n");
  };
  doc.content?.forEach(walk);
  return parts.join("").replace(/\n{2,}/g, "\n").trim();
}

/** Minutes de lecture, a 220 mots par minute, jamais moins d'une. */
export function readingMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/** Les intertitres (h2), pour le sommaire. Leurs ancres viennent de slugify. */
export function documentHeadings(doc: BlogDocument): { id: string; text: string }[] {
  return (doc.content ?? [])
    .filter((node) => node.type === "heading" && node.attrs?.level === 2)
    .map((node) => {
      const text = (node.content ?? []).map((child) => child.text ?? "").join("");
      return { id: slugify(text), text };
    })
    .filter((heading) => heading.text);
}

/** « Régler l'action d'une guitare » → « regler-l-action-d-une-guitare ». */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/, "");
}
