import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getMyStaffRole } from "@/lib/actions/staff";
import { getPostBySlug } from "@/lib/actions/blog";
import { blogPostUrl } from "@/lib/blog/categories";
import { PostArticle } from "@/components/blog/post-article";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  // La version de reference est la page publique
  return { title: `${post.title} | Ostinara`, alternates: { canonical: blogPostUrl(post.slug) } };
}

/** L'article dans l'app. L'equipe y voit aussi les brouillons (apercu). */
export default async function CommuBlogPostPage({ params }: Props) {
  const { slug } = await params;
  const [user, role, post] = await Promise.all([
    getAuthenticatedUser(),
    getMyStaffRole(),
    getPostBySlug(slug),
  ]);
  if (!post) notFound();

  const t = await getTranslations("blog");

  return (
    <>
      {role && (
        <div className="mx-auto mb-4 flex max-w-2xl justify-end">
          <Link
            href={`/commu/blog/ecrire/${post.id}`}
            className="inline-flex min-h-[34px] items-center rounded-full border border-border px-3 text-xs font-bold hover:bg-accent"
          >
            {t("editPost")}
          </Link>
        </div>
      )}
      <PostArticle post={post} context="app" viewer={{ id: user?.id ?? null, isStaff: role !== null }} />
    </>
  );
}
