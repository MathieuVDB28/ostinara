import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getForumTopics } from "@/lib/actions/forum";
import { parseForumParams, type ForumSearchParams } from "@/lib/forum";
import { siteUrl } from "@/lib/blog/categories";
import { ForumIndex } from "@/components/forum/forum-index";
import type { Locale } from "@/i18n/config";

interface Props {
  searchParams: Promise<ForumSearchParams>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const t = await getTranslations("meta.forum");
  const params = await searchParams;
  return {
    metadataBase: new URL(siteUrl()),
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/forum" },
    // Les pages de recherche ne s'indexent pas : seulement la liste et les sujets
    robots: params.q ? { index: false, follow: true } : undefined,
    openGraph: { title: t("title"), description: t("description"), type: "website", url: "/forum" },
  };
}

/** Le forum public : lisible sans compte. Connecte, on le lit dans l'app. */
export default async function ForumPage({ searchParams }: Props) {
  const raw = await searchParams;
  if (await getAuthenticatedUser()) {
    const query = new URLSearchParams(raw as Record<string, string>).toString();
    redirect(query ? `/commu/forum?${query}` : "/commu/forum");
  }

  const t = await getTranslations("forum");
  const params = parseForumParams(raw);
  const locale = (await getLocale()) as Locale;
  const { topics, hasMore } = await getForumTopics({
    category: params.category,
    filter: params.filter,
    query: params.query,
    locale: params.allLocales ? null : locale,
    page: params.page,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-6 space-y-2">
        <h1 className="font-display text-5xl font-extrabold uppercase leading-none sm:text-6xl">{t("title")}</h1>
        <p className="text-muted-foreground">{t("tagline")}</p>
      </header>
      <ForumIndex topics={topics} hasMore={hasMore} params={params} context="public" />
    </div>
  );
}
