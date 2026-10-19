import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import { FILTER_PARAM, FORUM_CATEGORIES, forumTopicAppHref, forumTopicUrl, type ForumParams } from "@/lib/forum";
import { EmptyState } from "@/components/ui/empty-state";
import { TopicRow } from "./topic-row";
import type { ForumTopicSummary } from "@/types";

interface Props {
  topics: ForumTopicSummary[];
  hasMore: boolean;
  params: ForumParams;
  context: "public" | "app";
  /** Equipe : signalements en attente (lien vers la moderation). */
  openReports?: number;
}

const pill =
  "inline-flex min-h-[34px] shrink-0 items-center rounded-full border px-3 text-xs font-bold transition-colors";
const on = "border-foreground bg-foreground text-background";
const off = "border-border hover:bg-accent";

/**
 * La liste du forum : recherche, rubriques, filtres (sans reponse,
 * resolus), pagination. Tout passe par l'URL (?q=…&rubrique=…&filtre=…) :
 * partageable, et lisible par les moteurs de recherche.
 */
export async function ForumIndex({ topics, hasMore, params, context, openReports = 0 }: Props) {
  const t = await getTranslations("forum");
  const te = await getTranslations("enums");
  const base = context === "public" ? "/forum" : "/commu/forum";
  const hrefFor = context === "public" ? forumTopicUrl : forumTopicAppHref;

  const href = (next: Partial<ForumParams>) => {
    const merged = { ...params, page: 0, ...next };
    const search = new URLSearchParams();
    if (merged.query) search.set("q", merged.query);
    if (merged.category) search.set("rubrique", merged.category);
    if (merged.filter !== "all") search.set("filtre", FILTER_PARAM[merged.filter]);
    if (merged.allLocales) search.set("langues", "toutes");
    if (merged.page > 0) search.set("page", String(merged.page + 1));
    const query = search.toString();
    return query ? `${base}?${query}` : base;
  };

  const newTopicHref = context === "app" ? "/commu/forum/nouveau" : "/register";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <form action={base} className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={params.query}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-full border border-border bg-background py-2.5 pr-4 pl-9 text-sm outline-none focus:border-primary"
          />
          {params.category && <input type="hidden" name="rubrique" value={params.category} />}
          {params.allLocales && <input type="hidden" name="langues" value="toutes" />}
          {params.filter !== "all" && <input type="hidden" name="filtre" value={FILTER_PARAM[params.filter]} />}
        </form>
        <Link
          href={newTopicHref}
          className="inline-flex min-h-[42px] items-center rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {t("newTopic")}
        </Link>
      </div>

      {openReports > 0 && (
        <Link
          href="/commu/forum/moderation"
          className="flex items-center justify-between rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold"
        >
          {t("openReports", { count: openReports })}
          <span aria-hidden="true">→</span>
        </Link>
      )}

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label={t("categories")}>
        <Link href={href({ category: null })} className={`${pill} ${!params.category ? on : off}`}>
          {t("allCategories")}
        </Link>
        {FORUM_CATEGORIES.map((value) => (
          <Link key={value} href={href({ category: value })} className={`${pill} ${params.category === value ? on : off}`}>
            {te(`forumCategory.${value}`)}
          </Link>
        ))}
      </nav>

      <div className="flex gap-4 border-b border-border text-sm font-semibold">
        {(["all", "unanswered", "solved"] as const).map((value) => (
          <Link
            key={value}
            href={href({ filter: value })}
            className={`-mb-px border-b-2 pb-2 ${
              params.filter === value ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(`filter.${value}`)}
          </Link>
        ))}
      </div>

      {params.query && (
        <p className="text-sm text-muted-foreground">
          {t("resultsFor", { query: params.query })}{" "}
          <Link href={href({ query: "" })} className="font-semibold text-primary hover:underline">
            {t("clearSearch")}
          </Link>
        </p>
      )}

      {topics.length > 0 ? (
        <ul className="divide-y divide-border">
          {topics.map((topic) => (
            <TopicRow key={topic.id} topic={topic} href={hrefFor(topic.slug)} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon="chat_bubble_outline"
          title={t(params.query ? "empty.searchTitle" : "empty.title")}
          description={t(params.query ? "empty.searchBody" : "empty.body")}
          actions={[{ label: t("newTopic"), href: newTopicHref, primary: true }]}
        />
      )}

      <div className="flex items-center justify-between gap-3 text-sm font-semibold">
        {params.page > 0 ? (
          <Link href={href({ page: params.page - 1 })} className="text-muted-foreground hover:text-foreground">
            ← {t("previousPage")}
          </Link>
        ) : (
          <span />
        )}
        {hasMore && (
          <Link href={href({ page: params.page + 1 })} className="text-muted-foreground hover:text-foreground">
            {t("nextPage")} →
          </Link>
        )}
      </div>

      <p className="text-center text-sm">
        <Link href={href({ allLocales: !params.allLocales })} className="font-semibold text-muted-foreground hover:text-foreground">
          {params.allLocales ? t("myLanguageOnly") : t("allLanguages")}
        </Link>
      </p>
    </div>
  );
}
