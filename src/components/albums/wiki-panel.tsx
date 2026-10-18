"use client";

import { useState } from "react";
import Link from "next/link";
import type { WikiAlbumLink, WikiArticle, WikiFact } from "@/types";
import { Icon } from "@/components/ui/icon";

/** Les titres de section de chaque page : mono sur l'album, gras sur l'artiste. */
export const HEADINGS = {
  album:
    "mb-1 border-b border-border pb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
  artist: "mb-1 border-b border-border pb-2 text-lg font-extrabold tracking-[-0.01em]",
};

/** L'album espace ses sections par le haut, l'artiste par le bas. */
export const SPACING = { album: "mt-8", artist: "mb-8" };

interface Props {
  variant: keyof typeof HEADINGS;
  title: string;
  article: WikiArticle | null;
  facts: WikiFact[];
  wikidataId: string;
  previous?: WikiAlbumLink | null;
  next?: WikiAlbumLink | null;
}

/**
 * La fiche et l'article Wikipedia d'un album ou d'un artiste. L'intro se
 * deplie, les sections s'ouvrent une a une : la page reste celle de
 * l'album, l'encyclopedie est la pour qui veut lire.
 */
export function WikiPanel({ variant, title, article, facts, wikidataId, previous, next }: Props) {
  const [expanded, setExpanded] = useState(false);
  const intro = article?.intro ?? [];
  const shownIntro = expanded ? intro : intro.slice(0, 1);

  return (
    <section className={SPACING[variant]}>
      <div className={`flex items-baseline justify-between gap-3 ${HEADINGS[variant]}`}>
        <h2>{title}</h2>
        {article && article.lang !== "fr" && (
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-normal text-muted-foreground">
            Article en {article.lang === "en" ? "anglais" : article.lang}
          </span>
        )}
      </div>

      {facts.length > 0 && (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-1.5 py-3 text-sm">
          {facts.map((fact) => (
            <div key={fact.label} className="contents">
              <dt className="text-muted-foreground">{fact.label}</dt>
              <dd className="font-medium">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {(previous || next) && (
        <div className="flex items-center justify-between gap-3 border-t border-border py-2.5 text-sm">
          <AlbumNeighbour album={previous} direction="previous" />
          <AlbumNeighbour album={next} direction="next" />
        </div>
      )}

      {intro.length > 0 && (
        <div className="border-t border-border py-3">
          <div className="space-y-3 font-serif text-[15px] leading-relaxed">
            {shownIntro.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          {intro.length > 1 && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-2 inline-flex min-h-[36px] items-center gap-1 text-sm font-semibold text-primary underline-offset-2 hover:underline"
            >
              {expanded ? "Réduire" : "Lire la suite"}
              <Icon name={expanded ? "expand_less" : "expand_more"} className="h-4 w-4" strokeWidth={2.25} />
            </button>
          )}
        </div>
      )}

      {article && article.sections.length > 0 && (
        <div className="divide-y divide-border border-y border-border">
          {article.sections.map((section) => (
            <details key={section.title} className="group">
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                {section.title}
                <Icon
                  name="expand_more"
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  strokeWidth={2.25}
                />
              </summary>
              <div className="space-y-3 pb-4 font-serif text-[15px] leading-relaxed">
                {section.paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
                {section.subsections.map((sub) => (
                  <div key={sub.title} className="space-y-3">
                    <h3 className="pt-2 font-sans text-sm font-bold">{sub.title}</h3>
                    {sub.paragraphs.map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}

      <WikiAttribution article={article} wikidataId={wikidataId} />
    </section>
  );
}

function AlbumNeighbour({ album, direction }: { album?: WikiAlbumLink | null; direction: "previous" | "next" }) {
  const isNext = direction === "next";
  if (!album) return <span />;

  const content = (
    <>
      {!isNext && <Icon name="chevron_left" className="h-4 w-4 shrink-0" strokeWidth={2.25} />}
      <span className="min-w-0">
        <span className="block text-xs text-muted-foreground">{isNext ? "Album suivant" : "Album précédent"}</span>
        <span className="block truncate font-semibold">{album.name}</span>
      </span>
      {isNext && <Icon name="chevron_right" className="h-4 w-4 shrink-0" strokeWidth={2.25} />}
    </>
  );
  const className = `flex min-w-0 max-w-[48%] items-center gap-1.5 ${isNext ? "text-right" : ""}`;

  return album.deezerId ? (
    <Link href={`/albums/${album.deezerId}`} className={`${className} rounded-lg transition-colors hover:text-primary`}>
      {content}
    </Link>
  ) : (
    <span className={className}>{content}</span>
  );
}

/** Le texte vient de Wikipedia, sous CC BY-SA : on cite l'article et la licence. */
export function WikiAttribution({ article, wikidataId }: { article: WikiArticle | null; wikidataId: string }) {
  const link = "underline underline-offset-2 hover:text-foreground";
  return (
    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
      {article && (
        <>
          Texte :{" "}
          <a href={article.url} target="_blank" rel="noopener noreferrer" className={link}>
            « {article.title} »
          </a>{" "}
          sur Wikipédia, sous licence{" "}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" target="_blank" rel="noopener noreferrer" className={link}>
            CC BY-SA 4.0
          </a>
          .{" "}
        </>
      )}
      Fiche :{" "}
      <a href={`https://www.wikidata.org/wiki/${wikidataId}`} target="_blank" rel="noopener noreferrer" className={link}>
        Wikidata
      </a>
      .
    </p>
  );
}

export function WikiSkeleton({ variant }: { variant: keyof typeof HEADINGS }) {
  return (
    <div className={`${SPACING[variant]} animate-pulse`} aria-hidden="true">
      <div className={HEADINGS[variant]}>
        <div className="h-3 w-24 rounded bg-muted" />
      </div>
      <div className="space-y-2 py-3">
        <div className="h-3.5 w-2/3 rounded bg-muted" />
        <div className="h-3.5 w-1/2 rounded bg-muted" />
        <div className="h-3.5 w-3/5 rounded bg-muted" />
      </div>
      <div className="space-y-2 border-t border-border py-3">
        <div className="h-3.5 w-full rounded bg-muted" />
        <div className="h-3.5 w-full rounded bg-muted" />
        <div className="h-3.5 w-4/5 rounded bg-muted" />
      </div>
    </div>
  );
}
