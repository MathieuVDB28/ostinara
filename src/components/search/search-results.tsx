"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { MIN_QUERY_LENGTH } from "./use-global-search";
import type { SearchResult, SearchResultGroup } from "@/types";

interface SearchResultsProps {
  groups: SearchResultGroup[];
  query: string;
  isSearching: boolean;
  /** Index dans la liste a plat — la selection clavier de la palette. */
  activeIndex?: number;
  /** Id de l'element actif, pour aria-activedescendant cote champ. */
  idPrefix?: string;
  onSelect?: (result: SearchResult) => void;
  /** Ce qu'on affiche avant la premiere frappe. */
  placeholder?: ReactNode;
}

function ResultRow({
  result,
  isActive,
  id,
  onSelect,
}: {
  result: SearchResult;
  isActive: boolean;
  id: string;
  onSelect?: (result: SearchResult) => void;
}) {
  return (
    <li role="option" aria-selected={isActive} id={id}>
      <Link
        href={result.href}
        onClick={() => onSelect?.(result)}
        tabIndex={-1}
        className={`flex min-h-[56px] items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
          isActive ? "bg-accent" : "hover:bg-accent/60"
        }`}
      >
        {result.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.imageUrl}
            alt=""
            className="h-10 w-10 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
              {result.icon}
            </span>
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{result.title}</span>
          {result.subtitle && (
            <span className="block truncate text-xs text-muted-foreground">
              {result.subtitle}
            </span>
          )}
        </span>

        <span
          aria-hidden="true"
          className="material-symbols-outlined shrink-0 text-muted-foreground"
        >
          chevron_right
        </span>
      </Link>
    </li>
  );
}

export function SearchResults({
  groups,
  query,
  isSearching,
  activeIndex = -1,
  idPrefix = "search-result",
  onSelect,
  placeholder,
}: SearchResultsProps) {
  const trimmed = query.trim();

  if (trimmed.length < MIN_QUERY_LENGTH) {
    return <>{placeholder}</>;
  }

  if (isSearching && groups.length === 0) {
    return (
      <p
        role="status"
        className="px-3 py-8 text-center text-sm text-muted-foreground"
      >
        Recherche…
      </p>
    );
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        compact
        icon="search_off"
        title={`Rien pour « ${trimmed} »`}
        description="La recherche couvre tes morceaux, albums, covers, exercices, matos et amis. Vérifie l'orthographe, ou ajoute-le."
        actions={[
          { label: "Ajouter un morceau", icon: "add", href: "/biblio", primary: true },
          { label: "Trouver un ami", icon: "person", href: "/commu/amis" },
        ]}
      />
    );
  }

  /*
   * L'index a plat suit l'ordre d'affichage : c'est celui que les fleches
   * parcourent, groupes compris. On le calcule par decalage de groupe
   * plutot qu'avec un compteur mute pendant le rendu.
   */
  const offsets = groups.map((_, groupIndex) =>
    groups
      .slice(0, groupIndex)
      .reduce((total, group) => total + group.results.length, 0)
  );

  return (
    <div className="space-y-4">
      {groups.map((group, groupIndex) => (
        <section key={group.kind} aria-labelledby={`${idPrefix}-${group.kind}`}>
          <h2
            id={`${idPrefix}-${group.kind}`}
            className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {group.label}
          </h2>
          <ul role="listbox" aria-label={group.label} className="space-y-0.5">
            {group.results.map((result, resultIndex) => {
              const flatIndex = offsets[groupIndex] + resultIndex;
              return (
                <ResultRow
                  key={`${result.kind}-${result.id}`}
                  result={result}
                  id={`${idPrefix}-${flatIndex}`}
                  isActive={flatIndex === activeIndex}
                  onSelect={onSelect}
                />
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
