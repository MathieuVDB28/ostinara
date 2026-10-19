import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getMyGearForForum } from "@/lib/actions/forum";
import { TopicForm } from "@/components/forum/topic-form";
import type { Locale } from "@/i18n/config";

export async function generateMetadata() {
  const t = await getTranslations("meta.forumNew");
  return { title: t("title") };
}

export default async function NewForumTopicPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const [locale, gear] = await Promise.all([getLocale(), getMyGearForForum()]);
  return <TopicForm userId={user.id} defaultLocale={locale as Locale} gear={gear} />;
}
