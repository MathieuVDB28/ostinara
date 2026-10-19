import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getMyStaffRole } from "@/lib/actions/staff";
import { getPostForEdit, getTranslatablePosts } from "@/lib/actions/blog";
import { PostEditor } from "@/components/blog/editor/post-editor";
import type { Locale } from "@/i18n/config";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata() {
  const t = await getTranslations("meta.blogWrite");
  return { title: t("title") };
}

export default async function EditBlogPostPage({ params }: Props) {
  const { id } = await params;
  const [user, role] = await Promise.all([getAuthenticatedUser(), getMyStaffRole()]);
  if (!user || !role) notFound();

  const [post, translatable] = await Promise.all([getPostForEdit(id), getTranslatablePosts()]);
  if (!post) notFound();

  const locale = (await getLocale()) as Locale;
  // Supprimer : l'auteur ou un admin (meme regle que la base)
  const canDelete = role === "admin" || post.author?.id === user.id;

  return (
    <PostEditor
      key={post.id}
      post={post}
      userId={user.id}
      defaultLocale={locale}
      translatable={translatable}
      canDelete={canDelete}
    />
  );
}
