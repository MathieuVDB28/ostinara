import type { ForumCategory } from "@/types";

export type ForumFilter = "all" | "unanswered" | "solved";

/** Les filtres de la liste, lus dans l'URL (?q=…&rubrique=…&filtre=…&langues=toutes&page=2). */
export interface ForumParams {
  category: ForumCategory | null;
  filter: ForumFilter;
  query: string;
  allLocales: boolean;
  page: number;
}

export type ForumSearchParams = Partial<Record<"q" | "rubrique" | "filtre" | "langues" | "page", string>>;


/**
 * Le forum, cote client et serveur : rubriques et adresses. Libelles des
 * rubriques : namespace `enums`, ``te(`forumCategory.${category}`)``.
 */
export const FORUM_CATEGORIES: ForumCategory[] = [
  "gear_buying",
  "setup_repair",
  "technique",
  "theory",
  "home_studio",
  "band_stage",
  "introductions",
  "off_topic",
];

export function isForumCategory(value: unknown): value is ForumCategory {
  return FORUM_CATEGORIES.includes(value as ForumCategory);
}

/** L'adresse publique d'un sujet (partage, sitemap, canonique). */
export function forumTopicUrl(slug: string): string {
  return `/forum/${slug}`;
}

/** L'adresse d'un sujet dans l'app (onglet Commu). */
export function forumTopicAppHref(slug: string): string {
  return `/commu/forum/${slug}`;
}

export function parseForumParams(params: ForumSearchParams): ForumParams {
  const page = Number(params.page);
  return {
    category: isForumCategory(params.rubrique) ? params.rubrique : null,
    filter: params.filtre === "sans-reponse" ? "unanswered" : params.filtre === "resolus" ? "solved" : "all",
    query: (params.q ?? "").slice(0, 200),
    allLocales: params.langues === "toutes",
    page: Number.isInteger(page) && page > 1 ? page - 1 : 0,
  };
}

/** Le filtre tel qu'il s'ecrit dans l'URL. */
export const FILTER_PARAM: Record<ForumFilter, string> = {
  all: "",
  unanswered: "sans-reponse",
  solved: "resolus",
};
