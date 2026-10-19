import { getTranslations } from "next-intl/server";
import { getPublishedPosts } from "@/lib/actions/blog";
import { blogPostUrl, siteUrl } from "@/lib/blog/categories";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Le flux RSS du blog : les 30 derniers articles, toutes langues. */
export async function GET() {
  const base = siteUrl();
  const t = await getTranslations("meta.blog");
  const posts = await getPublishedPosts({ limit: 30 });

  const items = posts
    .map((post) => {
      const url = `${base}${blogPostUrl(post.slug)}`;
      const author = post.author?.display_name || post.author?.username;
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(post.published_at!).toUTCString()}</pubDate>
      ${author ? `<dc:creator>${escapeXml(author)}</dc:creator>` : ""}
      <category>${post.category}</category>
      ${post.excerpt ? `<description>${escapeXml(post.excerpt)}</description>` : ""}
      ${post.cover_url ? `<enclosure url="${escapeXml(post.cover_url)}" type="image/jpeg" length="0" />` : ""}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Ostinara — Blog</title>
    <link>${base}/blog</link>
    <atom:link href="${base}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(t("description"))}</description>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=600",
    },
  });
}
