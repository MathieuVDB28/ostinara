import type { BlogCategory } from "@/types";

/**
 * Les rubriques du blog, dans l'ordre des filtres. Libelles : namespace
 * `enums`, ``te(`blogCategory.${category}`)``.
 */
export const BLOG_CATEGORIES: BlogCategory[] = [
  "gear",
  "technique",
  "theory",
  "learning",
  "home_studio",
  "band_life",
  "culture",
  "news",
];

export function isBlogCategory(value: unknown): value is BlogCategory {
  return BLOG_CATEGORIES.includes(value as BlogCategory);
}

/** L'adresse publique d'un article (partage, sitemap, RSS, canonique). */
export function blogPostUrl(slug: string): string {
  return `/blog/${slug}`;
}

/** L'adresse d'un article dans l'app (onglet Commu). */
export function blogPostAppHref(slug: string): string {
  return `/commu/blog/${slug}`;
}

/** L'URL absolue du site, pour les liens qui sortent de l'app. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://ostinara.app").replace(/\/$/, "");
}
