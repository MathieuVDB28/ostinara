import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import type { BlogPostSummary } from "@/types";

interface Props {
  post: BlogPostSummary;
  href: string;
  /** La premiere carte d'une liste, en grand. */
  featured?: boolean;
  /** Equipe : etat de l'article (brouillon, programme). */
  showStatus?: boolean;
}

export function PostCard({ post, href, featured = false, showStatus = false }: Props) {
  const t = useTranslations("blog");
  const te = useTranslations("enums");
  const format = useFormatter();
  const author = post.author?.display_name || post.author?.username;
  const scheduled = post.status === "published" && post.published_at && new Date(post.published_at) > new Date();

  return (
    <Link
      href={href}
      className={`group flex gap-4 ${featured ? "flex-col" : "flex-row-reverse items-start sm:flex-col sm:items-stretch"}`}
    >
      {post.cover_url ? (
        <img
          src={post.cover_url}
          alt=""
          loading="lazy"
          className={`shrink-0 rounded-xl bg-muted object-cover ${
            featured ? "aspect-[16/9] w-full" : "h-20 w-20 sm:aspect-[16/9] sm:h-auto sm:w-full"
          }`}
        />
      ) : (
        <span
          className={`shrink-0 rounded-xl bg-muted ${featured ? "aspect-[16/9] w-full" : "h-20 w-20 sm:aspect-[16/9] sm:h-auto sm:w-full"}`}
        />
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-primary">
          {te(`blogCategory.${post.category}`)}
          {showStatus && post.status === "draft" && <span className="ml-2 text-muted-foreground">· {t("draft")}</span>}
          {showStatus && scheduled && (
            <span className="ml-2 text-muted-foreground">
              · {t("scheduledFor", { date: format.dateTime(new Date(post.published_at!), { dateStyle: "medium", timeStyle: "short" }) })}
            </span>
          )}
        </p>
        <h3
          className={`font-display font-extrabold uppercase leading-[1.05] group-hover:text-primary ${
            featured ? "text-3xl sm:text-4xl" : "text-xl"
          }`}
        >
          {post.title}
        </h3>
        {post.excerpt && (
          <p className={`text-sm text-muted-foreground ${featured ? "" : "line-clamp-2"}`}>{post.excerpt}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {[
            author,
            post.published_at && !scheduled
              ? format.dateTime(new Date(post.published_at), { dateStyle: "medium" })
              : null,
            t("readingTime", { minutes: post.reading_minutes }),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </Link>
  );
}
