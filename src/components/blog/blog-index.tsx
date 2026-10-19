import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BLOG_CATEGORIES, blogPostAppHref, blogPostUrl } from "@/lib/blog/categories";
import { EmptyState } from "@/components/ui/empty-state";
import { PostCard } from "./post-card";
import type { BlogCategory, BlogPostSummary } from "@/types";

interface Props {
  posts: BlogPostSummary[];
  context: "public" | "app";
  category: BlogCategory | null;
  allLocales: boolean;
  /** Equipe : brouillons et articles programmes, au-dessus de la liste. */
  unpublished?: BlogPostSummary[];
  canWrite?: boolean;
}

const pill =
  "inline-flex min-h-[34px] shrink-0 items-center rounded-full border px-3 text-xs font-bold transition-colors";

/**
 * La liste du blog : rubriques en pastilles, langue de l'utilisateur
 * d'abord (« toutes les langues » en option), le dernier article en grand.
 * Les filtres sont des liens (?rubrique=…&langues=toutes) : partageables,
 * et lisibles par les moteurs de recherche.
 */
export async function BlogIndex({ posts, context, category, allLocales, unpublished = [], canWrite = false }: Props) {
  const t = await getTranslations("blog");
  const te = await getTranslations("enums");
  const base = context === "public" ? "/blog" : "/commu/blog";
  const hrefFor = context === "public" ? blogPostUrl : blogPostAppHref;

  const filterHref = (next: { category?: BlogCategory | null; all?: boolean }) => {
    const params = new URLSearchParams();
    const c = next.category === undefined ? category : next.category;
    const a = next.all === undefined ? allLocales : next.all;
    if (c) params.set("rubrique", c);
    if (a) params.set("langues", "toutes");
    const query = params.toString();
    return query ? `${base}?${query}` : base;
  };

  const [first, ...rest] = posts;

  return (
    <div className="space-y-8">
      {canWrite && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-1.5">
            <h2 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t("inProgress", { count: unpublished.length })}
            </h2>
            <Link
              href="/commu/blog/ecrire"
              className="inline-flex min-h-[34px] items-center rounded-full bg-primary px-3 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {t("write")}
            </Link>
          </div>
          {unpublished.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-3">
              {unpublished.map((post) => (
                <PostCard key={post.id} post={post} href={`/commu/blog/ecrire/${post.id}`} showStatus />
              ))}
            </div>
          )}
        </section>
      )}

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label={t("categories")}>
        <Link
          href={filterHref({ category: null })}
          className={`${pill} ${!category ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent"}`}
        >
          {t("allCategories")}
        </Link>
        {BLOG_CATEGORIES.map((value) => (
          <Link
            key={value}
            href={filterHref({ category: value })}
            className={`${pill} ${category === value ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent"}`}
          >
            {te(`blogCategory.${value}`)}
          </Link>
        ))}
      </nav>

      {first ? (
        <>
          <PostCard post={first} href={hrefFor(first.slug)} featured />
          {rest.length > 0 && (
            <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <PostCard key={post.id} post={post} href={hrefFor(post.slug)} />
              ))}
            </div>
          )}
        </>
      ) : (
        <EmptyState icon="menu_book" title={t("empty.title")} description={t("empty.body")} />
      )}

      <p className="text-center text-sm">
        <Link href={filterHref({ all: !allLocales })} className="font-semibold text-muted-foreground hover:text-foreground">
          {allLocales ? t("myLanguageOnly") : t("allLanguages")}
        </Link>
      </p>
    </div>
  );
}
