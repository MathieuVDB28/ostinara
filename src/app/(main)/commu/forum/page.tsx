import { getLocale, getTranslations } from "next-intl/server";
import { getMyStaffRole } from "@/lib/actions/staff";
import { getForumTopics, getOpenForumReportsCount } from "@/lib/actions/forum";
import { parseForumParams, type ForumSearchParams } from "@/lib/forum";
import { ForumIndex } from "@/components/forum/forum-index";
import type { Locale } from "@/i18n/config";

interface Props {
  searchParams: Promise<ForumSearchParams>;
}

export async function generateMetadata() {
  const t = await getTranslations("meta.forum");
  return { title: t("title") };
}

export default async function CommuForumPage({ searchParams }: Props) {
  const params = parseForumParams(await searchParams);
  const locale = (await getLocale()) as Locale;

  const [role, { topics, hasMore }] = await Promise.all([
    getMyStaffRole(),
    getForumTopics({
      category: params.category,
      filter: params.filter,
      query: params.query,
      locale: params.allLocales ? null : locale,
      page: params.page,
    }),
  ]);
  const openReports = role ? await getOpenForumReportsCount() : 0;

  return <ForumIndex topics={topics} hasMore={hasMore} params={params} context="app" openReports={openReports} />;
}
