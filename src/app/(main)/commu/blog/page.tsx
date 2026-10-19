import { getLocale, getTranslations } from "next-intl/server";
import { getMyStaffRole } from "@/lib/actions/staff";
import { getPublishedPosts, getUnpublishedPosts } from "@/lib/actions/blog";
import { isBlogCategory } from "@/lib/blog/categories";
import { BlogIndex } from "@/components/blog/blog-index";
import type { Locale } from "@/i18n/config";

interface Props {
  searchParams: Promise<{ rubrique?: string; langues?: string }>;
}

export async function generateMetadata() {
  const t = await getTranslations("meta.blog");
  return { title: t("title") };
}

export default async function CommuBlogPage({ searchParams }: Props) {
  const params = await searchParams;
  const locale = (await getLocale()) as Locale;
  const category = isBlogCategory(params.rubrique) ? params.rubrique : null;
  const allLocales = params.langues === "toutes";

  const [role, posts] = await Promise.all([
    getMyStaffRole(),
    getPublishedPosts({ locale: allLocales ? null : locale, category }),
  ]);
  const unpublished = role ? await getUnpublishedPosts() : [];

  return (
    <BlogIndex
      posts={posts}
      context="app"
      category={category}
      allLocales={allLocales}
      unpublished={unpublished}
      canWrite={role !== null}
    />
  );
}
