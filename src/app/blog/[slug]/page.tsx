import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getPostBySlug, getPostTranslations } from "@/lib/actions/blog";
import { blogPostAppHref, blogPostUrl, siteUrl } from "@/lib/blog/categories";
import { PostArticle } from "@/components/blog/post-article";

interface Props {
  params: Promise<{ slug: string }>;
}

function isLive(post: { status: string; published_at: string | null }) {
  return post.status === "published" && post.published_at !== null && new Date(post.published_at) <= new Date();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || !isLive(post)) return {};

  const translations = await getPostTranslations(post.translation_group, post.id);
  const author = post.author?.display_name || post.author?.username;

  return {
    metadataBase: new URL(siteUrl()),
    title: `${post.title} | Ostinara`,
    description: post.excerpt ?? undefined,
    authors: author ? [{ name: author }] : undefined,
    alternates: {
      canonical: blogPostUrl(post.slug),
      languages: Object.fromEntries([
        [post.locale, blogPostUrl(post.slug)],
        ...translations.map((tr) => [tr.locale, blogPostUrl(tr.slug)]),
      ]),
    },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt ?? undefined,
      url: blogPostUrl(post.slug),
      locale: post.locale === "en" ? "en_US" : "fr_FR",
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      authors: author ? [author] : undefined,
      images: post.cover_url ? [{ url: post.cover_url }] : undefined,
    },
    twitter: {
      card: post.cover_url ? "summary_large_image" : "summary",
      title: post.title,
      description: post.excerpt ?? undefined,
      images: post.cover_url ? [post.cover_url] : undefined,
    },
  };
}

export default async function PublicBlogPostPage({ params }: Props) {
  const { slug } = await params;
  // Connecte, on lit l'article dans l'app (et on peut commenter)
  if (await getAuthenticatedUser()) redirect(blogPostAppHref(slug));

  const post = await getPostBySlug(slug);
  if (!post || !isLive(post)) notFound();

  return (
    <div className="px-4 py-10 sm:px-6">
      <PostArticle post={post} context="public" viewer={{ id: null, isStaff: false }} />
    </div>
  );
}
