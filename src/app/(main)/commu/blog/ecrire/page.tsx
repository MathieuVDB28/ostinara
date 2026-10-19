import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getMyStaffRole } from "@/lib/actions/staff";
import { getTranslatablePosts } from "@/lib/actions/blog";
import { PostEditor } from "@/components/blog/editor/post-editor";
import type { Locale } from "@/i18n/config";

export async function generateMetadata() {
  const t = await getTranslations("meta.blogWrite");
  return { title: t("title") };
}

export default async function NewBlogPostPage() {
  const [user, role] = await Promise.all([getAuthenticatedUser(), getMyStaffRole()]);
  if (!user || !role) notFound();

  const locale = (await getLocale()) as Locale;
  // Toutes langues : l'editeur ne propose que celles d'une autre langue
  const translatable = await getTranslatablePosts();

  return (
    <PostEditor post={null} userId={user.id} defaultLocale={locale} translatable={translatable} canDelete={false} />
  );
}
