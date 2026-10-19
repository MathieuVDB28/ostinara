import type { MetadataRoute } from "next";
import { getPublishedSlugs } from "@/lib/actions/blog";
import { getPublicTopicSlugs } from "@/lib/actions/forum";
import { forumTopicUrl } from "@/lib/forum";
import { blogPostUrl, siteUrl } from "@/lib/blog/categories";

/**
 * Les pages publiques, pour les moteurs de recherche : l'accueil, la liste
 * d'attente, le blog et ses articles (avec leurs traductions), le forum et
 * ses sujets, le legal.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [posts, topics] = await Promise.all([getPublishedSlugs(), getPublicTopicSlugs()]);

  const byGroup = new Map<string, typeof posts>();
  for (const post of posts) {
    byGroup.set(post.translation_group, [...(byGroup.get(post.translation_group) ?? []), post]);
  }

  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/acces-anticipe`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/blog`, changeFrequency: "daily", priority: 0.8 },
    ...posts.map((post) => ({
      url: `${base}${blogPostUrl(post.slug)}`,
      lastModified: new Date(post.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.7,
      alternates: {
        languages: Object.fromEntries(
          (byGroup.get(post.translation_group) ?? []).map((p) => [p.locale, `${base}${blogPostUrl(p.slug)}`])
        ),
      },
    })),
    { url: `${base}/forum`, changeFrequency: "hourly", priority: 0.8 },
    ...topics.map((topic) => ({
      url: `${base}${forumTopicUrl(topic.slug)}`,
      lastModified: new Date(topic.last_activity_at),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    { url: `${base}/cgu`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/politique-confidentialite`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
