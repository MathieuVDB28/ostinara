import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getTopicBySlug } from "@/lib/actions/forum";
import { TopicForm } from "@/components/forum/topic-form";
import type { Locale } from "@/i18n/config";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata() {
  const t = await getTranslations("meta.forumEdit");
  return { title: t("title") };
}

export default async function EditForumTopicPage({ params }: Props) {
  const { slug } = await params;
  const [user, topic] = await Promise.all([getAuthenticatedUser(), getTopicBySlug(slug)]);
  // Seul l'auteur modifie son texte (meme regle que la base)
  if (!user || !topic || topic.author?.id !== user.id) notFound();

  const locale = (await getLocale()) as Locale;
  return <TopicForm topic={topic} userId={user.id} defaultLocale={locale} gear={[]} />;
}
