import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getPublishedPosts } from "@/lib/actions/blog";
import { isBlogCategory, siteUrl } from "@/lib/blog/categories";
import { BlogIndex } from "@/components/blog/blog-index";
import type { Locale } from "@/i18n/config";

interface Props {
  searchParams: Promise<{ rubrique?: string; langues?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.blog");
  return {
    metadataBase: new URL(siteUrl()),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: "/blog",
      types: { "application/rss+xml": "/blog/rss.xml" },
    },
    openGraph: { title: t("title"), description: t("description"), type: "website", url: "/blog" },
  };
}

/**
 * Le blog public : lisible sans compte, reference par les moteurs de
 * recherche. Connecte, on le lit dans l'app (Commu › Blog).
 */
export default async function BlogPage({ searchParams }: Props) {
  const params = await searchParams;
  if (await getAuthenticatedUser()) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    redirect(query ? `/commu/blog?${query}` : "/commu/blog");
  }

  const t = await getTranslations("blog");
  const locale = (await getLocale()) as Locale;
  const category = isBlogCategory(params.rubrique) ? params.rubrique : null;
  const allLocales = params.langues === "toutes";
  const posts = await getPublishedPosts({ locale: allLocales ? null : locale, category });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8 max-w-2xl space-y-2">
        <h1 className="font-display text-5xl font-extrabold uppercase leading-none sm:text-6xl">{t("title")}</h1>
        <p className="text-muted-foreground">{t("tagline")}</p>
      </header>
      <BlogIndex posts={posts} context="public" category={category} allLocales={allLocales} />
    </div>
  );
}
