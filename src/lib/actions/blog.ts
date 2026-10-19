"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { tErr } from "@/i18n/server";
import { isLocale, type Locale } from "@/i18n/config";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { INSTRUMENT_VALUES } from "@/lib/instruments";
import { isBlogCategory, blogPostAppHref } from "@/lib/blog/categories";
import {
  asDocument,
  documentText,
  readingMinutes,
  slugify,
  type ExerciseEmbedAttrs,
} from "@/lib/blog/document";
import { sendPushNotification } from "@/lib/notifications";
import type {
  BlogCategory,
  BlogComment,
  BlogPost,
  BlogPostSummary,
  Instrument,
} from "@/types";

const SUMMARY_SELECT = `id, slug, locale, translation_group, title, excerpt, cover_url, category,
  instruments, reading_minutes, status, published_at, updated_at,
  author:profiles!blog_posts_author_id_fkey(id, username, display_name, avatar_url, bio)`;

const COMMENT_SELECT = `id, post_id, user_id, content, edited_at, created_at,
  user:profiles!blog_comments_user_id_fkey(id, username, display_name, avatar_url)`;

/** Segments reserves sous /commu/blog : un article ne peut pas s'y appeler. */
const RESERVED_SLUGS = new Set(["ecrire", "rss", "rss-xml"]);

function revalidateBlog(slug?: string) {
  revalidatePath("/blog");
  revalidatePath("/commu/blog");
  revalidatePath("/sitemap.xml");
  if (slug) {
    revalidatePath(`/blog/${slug}`);
    revalidatePath(`/commu/blog/${slug}`);
  }
}

// === Lecture ===

/** Les articles publies, du plus recent au plus ancien. */
export async function getPublishedPosts(options: {
  locale?: Locale | null;
  category?: BlogCategory | null;
  limit?: number;
  excludeId?: string;
} = {}): Promise<BlogPostSummary[]> {
  const supabase = await createClient();
  let query = supabase
    .from("blog_posts")
    .select(SUMMARY_SELECT)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(options.limit ?? 50);

  if (options.locale) query = query.eq("locale", options.locale);
  if (options.category) query = query.eq("category", options.category);
  if (options.excludeId) query = query.neq("id", options.excludeId);

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching blog posts:", error);
    return [];
  }
  return (data ?? []) as unknown as BlogPostSummary[];
}

/**
 * Un article par son adresse. Les brouillons et articles programmes ne
 * sortent que pour l'equipe (RLS) : c'est son apercu.
 */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(`${SUMMARY_SELECT}, content`)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("Error fetching blog post:", error);
    return null;
  }
  return data as unknown as BlogPost | null;
}

/** Les autres langues d'un article publie (liens « Lire en English »). */
export async function getPostTranslations(
  translationGroup: string,
  excludeId: string
): Promise<{ slug: string; locale: Locale }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("slug, locale")
    .eq("translation_group", translationGroup)
    .neq("id", excludeId)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString());
  return (data ?? []) as { slug: string; locale: Locale }[];
}

/** Pour le sitemap : toutes les adresses publiques. */
export async function getPublishedSlugs(): Promise<
  { slug: string; locale: Locale; updated_at: string; translation_group: string }[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("slug, locale, updated_at, translation_group")
    .eq("status", "published")
    .lte("published_at", new Date().toISOString());
  return (data ?? []) as { slug: string; locale: Locale; updated_at: string; translation_group: string }[];
}

/** L'equipe : brouillons et articles programmes. Vide pour les autres (RLS). */
export async function getUnpublishedPosts(): Promise<BlogPostSummary[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(SUMMARY_SELECT)
    .or(`status.eq.draft,published_at.gt.${now}`)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching unpublished posts:", error);
    return [];
  }
  return (data ?? []) as unknown as BlogPostSummary[];
}

/** L'article a modifier (equipe). */
export async function getPostForEdit(id: string): Promise<BlogPost | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select(`${SUMMARY_SELECT}, content`)
    .eq("id", id)
    .maybeSingle();
  return data as unknown as BlogPost | null;
}

/** Les articles dont un nouvel article peut etre la traduction (equipe). */
export async function getTranslatablePosts(): Promise<
  { id: string; title: string; translation_group: string; locale: Locale }[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("id, title, translation_group, locale")
    .order("updated_at", { ascending: false })
    .limit(200);
  return (data ?? []) as { id: string; title: string; translation_group: string; locale: Locale }[];
}

/**
 * Les exercices qu'on peut citer dans un article : ceux du systeme, les
 * seuls que tous les lecteurs retrouvent dans leur onglet Jouer.
 */
export async function getBlogExercises(): Promise<ExerciseEmbedAttrs[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, description, category, difficulty, starting_bpm, target_bpm, time_signature, instruments, translations")
    .eq("is_system", true)
    .order("category")
    .order("difficulty")
    .order("name");

  if (error) {
    console.error("Error fetching blog exercises:", error);
    return [];
  }
  return (data ?? []).map((row) => ({
    exerciseId: row.id,
    name: row.name,
    nameEn: row.translations?.en?.name ?? null,
    description: row.description ?? null,
    descriptionEn: row.translations?.en?.description ?? null,
    category: row.category,
    difficulty: row.difficulty,
    startingBpm: row.starting_bpm,
    targetBpm: row.target_bpm,
    timeSignature: row.time_signature ?? "4/4",
    instruments: row.instruments ?? [],
  }));
}

// === Ecriture (equipe) ===

export interface SavePostInput {
  id?: string;
  title: string;
  slug?: string;
  excerpt?: string;
  coverUrl?: string | null;
  category: BlogCategory;
  instruments: Instrument[];
  locale: Locale;
  /**
   * Le translation_group de l'article dont celui-ci est la traduction.
   * Absent : inchange ; "" : detache (un groupe a lui seul).
   */
  translationGroup?: string;
  content: unknown;
  /** draft : brouillon ; publish : en ligne a publishedAt (maintenant si absent). */
  mode: "draft" | "publish";
  publishedAt?: string | null;
}

/** Un slug libre : « mon-article », sinon « mon-article-2 », etc. */
async function availableSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  wanted: string,
  ownId?: string
): Promise<string> {
  const base = RESERVED_SLUGS.has(wanted) ? `${wanted}-1` : wanted;
  const { data } = await supabase
    .from("blog_posts")
    .select("id, slug")
    .like("slug", `${base}%`);
  const taken = new Set((data ?? []).filter((row) => row.id !== ownId).map((row) => row.slug));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
  }
}

export async function saveBlogPost(
  input: SavePostInput
): Promise<{
  success: boolean;
  error?: string;
  id?: string;
  slug?: string;
  status?: BlogPost["status"];
  published_at?: string | null;
}> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const title = input.title.trim();
  if (!title || title.length > 160) {
    return { success: false, error: await tErr("blogTitleLength") };
  }
  if (!isBlogCategory(input.category) || !isLocale(input.locale)) {
    return { success: false, error: await tErr("updateFailed") };
  }

  const document = asDocument(input.content);
  const text = documentText(document);
  if (input.mode === "publish" && text.length < 200) {
    return { success: false, error: await tErr("blogTooShort") };
  }

  const supabase = await createClient();
  const existing = input.id ? await getPostForEdit(input.id) : null;
  if (input.id && !existing) {
    return { success: false, error: await tErr("blogPostNotFound") };
  }

  // Le slug se choisit tant que l'article n'est pas en ligne ; publie, il
  // ne bouge plus (liens partages, referencement).
  const isLive = existing?.status === "published" && existing.published_at
    && new Date(existing.published_at) <= new Date();
  const slug = isLive
    ? existing.slug
    : await availableSlug(supabase, slugify(input.slug || title) || "article", input.id);

  let publishedAt: string | null = null;
  if (input.mode === "publish") {
    publishedAt = input.publishedAt
      ? new Date(input.publishedAt).toISOString()
      : isLive
        ? existing!.published_at
        : new Date().toISOString();
  }

  const row = {
    title,
    slug,
    excerpt: input.excerpt?.trim().slice(0, 300) || text.slice(0, 200) || null,
    cover_url: input.coverUrl || null,
    category: input.category,
    instruments: input.instruments.filter((i) => INSTRUMENT_VALUES.includes(i)),
    locale: input.locale,
    content: document,
    content_text: text,
    reading_minutes: readingMinutes(text),
    status: input.mode === "publish" ? "published" : "draft",
    published_at: publishedAt,
    ...(input.translationGroup !== undefined
      ? { translation_group: input.translationGroup || crypto.randomUUID() }
      : {}),
  };

  const { data, error } = input.id
    ? await supabase.from("blog_posts").update(row).eq("id", input.id).select("id, slug, status, published_at").single()
    : await supabase
        .from("blog_posts")
        .insert({ ...row, author_id: user.id })
        .select("id, slug, status, published_at")
        .single();

  if (error || !data) {
    // 23505 sur (translation_group, locale) : cette langue existe deja
    if (error?.code === "23505") {
      return { success: false, error: await tErr("blogTranslationExists") };
    }
    // 42501 : pas de l'equipe
    console.error("Error saving blog post:", error);
    return { success: false, error: await tErr(error?.code === "42501" ? "staffOnly" : "updateFailed") };
  }

  revalidateBlog(data.slug);
  if (existing && existing.slug !== data.slug) revalidateBlog(existing.slug);
  return { success: true, id: data.id, slug: data.slug, status: data.status, published_at: data.published_at };
}

export async function deleteBlogPost(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .delete()
    .eq("id", id)
    .select("slug");

  if (error || !data?.length) {
    console.error("Error deleting blog post:", error);
    return { success: false, error: await tErr("blogDeleteForbidden") };
  }

  revalidateBlog(data[0].slug);
  return { success: true };
}

// === Commentaires ===

export async function getBlogComments(postId: string): Promise<BlogComment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blog_comments")
    .select(COMMENT_SELECT)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching blog comments:", error);
    return [];
  }
  return (data ?? []) as unknown as BlogComment[];
}

export async function addBlogComment(
  postId: string,
  content: string
): Promise<{ success: boolean; error?: string; comment?: BlogComment }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const text = content.trim();
  if (text.length < 1 || text.length > 1000) {
    return { success: false, error: await tErr("blogCommentLength") };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blog_comments")
    .insert({ post_id: postId, user_id: user.id, content: text })
    .select(COMMENT_SELECT)
    .single();

  if (error || !data) {
    console.error("Error adding blog comment:", error);
    return { success: false, error: await tErr("addFailed") };
  }

  const comment = data as unknown as BlogComment;

  // L'auteur de l'article est prevenu (sauf s'il se repond a lui-meme)
  after(async () => {
    const { data: post } = await supabase
      .from("blog_posts")
      .select("author_id, slug, title")
      .eq("id", postId)
      .single();
    if (!post || post.author_id === user.id) return;
    const name = comment.user?.display_name || comment.user?.username;
    await sendPushNotification(
      post.author_id,
      (t) => ({
        title: t("blogComment.title"),
        body: t("blogComment.body", { name: name ?? t("someone"), title: post.title }),
        tag: `blog-comment-${postId}`,
        data: { url: `${blogPostAppHref(post.slug)}#commentaires` },
      }),
      "blog_comment"
    );
  });

  return { success: true, comment };
}

export async function updateBlogComment(
  id: string,
  content: string
): Promise<{ success: boolean; error?: string; comment?: BlogComment }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const text = content.trim();
  if (text.length < 1 || text.length > 1000) {
    return { success: false, error: await tErr("blogCommentLength") };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blog_comments")
    .update({ content: text })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(COMMENT_SELECT)
    .single();

  if (error || !data) {
    console.error("Error updating blog comment:", error);
    return { success: false, error: await tErr("commentUpdateFailed") };
  }
  return { success: true, comment: data as unknown as BlogComment };
}

/** Le sien, ou n'importe lequel pour l'equipe (moderation, RLS). */
export async function deleteBlogComment(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const supabase = await createClient();
  const { data, error } = await supabase.from("blog_comments").delete().eq("id", id).select("id");

  if (error || !data?.length) {
    console.error("Error deleting blog comment:", error);
    return { success: false, error: await tErr("commentDeleteFailed") };
  }
  return { success: true };
}
