import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { asDocument, documentHeadings } from "@/lib/blog/document";
import { blogPostAppHref, blogPostUrl, siteUrl } from "@/lib/blog/categories";
import { instrumentLabel } from "@/lib/instruments";
import { profileHref } from "@/lib/navigation";
import {
  getBlogComments,
  getPostTranslations,
  getPublishedPosts,
} from "@/lib/actions/blog";
import { BlogContent } from "./blog-content";
import { BlogComments } from "./blog-comments";
import { PostCard } from "./post-card";
import type { BlogPost } from "@/types";

interface Props {
  post: BlogPost;
  /** public : /blog (visiteurs) ; app : /commu/blog (connectes). */
  context: "public" | "app";
  viewer: { id: string | null; isStaff: boolean };
}

/**
 * Un article : en-tete, sommaire, texte, auteur, appel a l'inscription
 * (visiteurs), commentaires et articles voisins. Le meme rendu sert la page
 * publique et l'onglet Commu ; seuls les liens changent.
 */
export async function PostArticle({ post, context, viewer }: Props) {
  const t = await getTranslations("blog");
  const te = await getTranslations("enums");
  const format = await getFormatter();
  const document = asDocument(post.content);
  const headings = documentHeadings(document);
  const hrefFor = context === "public" ? blogPostUrl : blogPostAppHref;
  const listHref = context === "public" ? "/blog" : "/commu/blog";

  const [comments, translations, related] = await Promise.all([
    getBlogComments(post.id),
    getPostTranslations(post.translation_group, post.id),
    getPublishedPosts({ locale: post.locale, category: post.category, limit: 3, excludeId: post.id }),
  ]);

  const author = post.author;
  const authorName = author?.display_name || author?.username;
  const isLive = post.status === "published" && post.published_at && new Date(post.published_at) <= new Date();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.cover_url ?? undefined,
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at,
    inLanguage: post.locale,
    author: authorName ? { "@type": "Person", name: authorName } : undefined,
    publisher: { "@type": "Organization", name: "Ostinara", logo: `${siteUrl()}/logo.png` },
    mainEntityOfPage: `${siteUrl()}${blogPostUrl(post.slug)}`,
  };

  return (
    <article className="mx-auto max-w-2xl">
      {isLive && (
        <script
          type="application/ld+json"
          // JSON genere ici, « < » echappe : pas d'injection possible
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      )}

      {!isLive && (
        <p className="mb-4 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm text-muted-foreground">
          {post.status === "draft"
            ? t("previewDraft")
            : t("previewScheduled", {
                date: format.dateTime(new Date(post.published_at!), { dateStyle: "long", timeStyle: "short" }),
              })}
        </p>
      )}

      <Link
        href={listHref}
        className="mb-4 inline-flex min-h-[36px] items-center text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        ← {t("backToBlog")}
      </Link>

      <header className="space-y-3">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-primary">
          {te(`blogCategory.${post.category}`)} · {t("readingTime", { minutes: post.reading_minutes })}
        </p>
        <h1 className="font-display text-4xl font-extrabold uppercase leading-[1.02] sm:text-5xl">
          {post.title}
        </h1>
        {post.excerpt && <p className="text-lg text-muted-foreground">{post.excerpt}</p>}
        <div className="flex items-center gap-3 pt-1">
          {author?.avatar_url ? (
            <img src={author.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <span className="h-10 w-10 rounded-full bg-muted" />
          )}
          <div className="text-sm">
            <p className="font-semibold">{authorName}</p>
            {post.published_at && (
              <p className="text-xs text-muted-foreground">
                {format.dateTime(new Date(post.published_at), { dateStyle: "long" })}
              </p>
            )}
          </div>
        </div>
        {translations.length > 0 && (
          <p className="text-sm">
            {translations.map((translation) => (
              <Link
                key={translation.slug}
                href={hrefFor(translation.slug)}
                hrefLang={translation.locale}
                className="font-semibold text-primary hover:underline"
              >
                {t("readIn", { locale: translation.locale })}
              </Link>
            ))}
          </p>
        )}
      </header>

      {post.cover_url && (
        <img src={post.cover_url} alt="" className="mt-6 aspect-[16/9] w-full rounded-2xl bg-muted object-cover" />
      )}

      {headings.length >= 3 && (
        <nav className="mt-8 rounded-2xl border border-border p-4" aria-label={t("toc")}>
          <p className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t("toc")}
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {headings.map((heading) => (
              <li key={heading.id}>
                <a href={`#${heading.id}`} className="hover:text-primary hover:underline">
                  {heading.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="mt-8">
        <BlogContent document={document} signedIn={viewer.id !== null} />
      </div>

      {post.instruments.length > 0 && (
        <p className="mt-8 flex flex-wrap gap-2">
          {post.instruments.map((instrument) => (
            <span key={instrument} className="rounded-full border border-border px-3 py-1 text-xs font-semibold">
              {instrumentLabel({ instrument }, te)}
            </span>
          ))}
        </p>
      )}

      {author && (
        <aside className="mt-10 flex gap-4 rounded-2xl border border-border p-4">
          {author.avatar_url ? (
            <img src={author.avatar_url} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="h-14 w-14 shrink-0 rounded-full bg-muted" />
          )}
          <div className="min-w-0 space-y-1">
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t("writtenBy")}
            </p>
            {context === "app" ? (
              <Link href={profileHref(author.username)} className="font-semibold hover:underline">
                {authorName}
              </Link>
            ) : (
              <p className="font-semibold">{authorName}</p>
            )}
            {author.bio && <p className="text-sm text-muted-foreground">{author.bio}</p>}
          </div>
        </aside>
      )}

      {context === "public" && (
        <aside className="mt-10 rounded-2xl bg-primary p-6 text-primary-foreground">
          <p className="font-display text-3xl font-extrabold uppercase leading-none">{t("cta.title")}</p>
          <p className="mt-2 text-sm opacity-90">{t("cta.body")}</p>
          <Link
            href="/register"
            className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-background px-5 text-sm font-bold text-foreground transition-opacity hover:opacity-90"
          >
            {t("cta.button")}
          </Link>
        </aside>
      )}

      {isLive && (
        <div className="mt-12">
          <BlogComments
            postId={post.id}
            initial={comments}
            currentUserId={viewer.id}
            isStaff={viewer.isStaff}
            loginHref="/login"
          />
        </div>
      )}

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 border-b border-border pb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t("related")}
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {related.map((item) => (
              <PostCard key={item.id} post={item} href={hrefFor(item.slug)} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
