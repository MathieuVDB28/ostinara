"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchResults } from "./search-results";
import { useGlobalSearch } from "./use-global-search";

/**
 * L'onglet Recherche.
 *
 * C'est la meme recherche que la palette cmd-K, dans une page : sur
 * telephone, un endroit qu'on atteint avec le pouce vaut mieux qu'un
 * raccourci clavier. Le champ prend le focus a l'arrivee — on vient ici
 * pour taper.
 */
export function SearchPageView() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const { groups, isSearching } = useGlobalSearch(query);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold lg:text-3xl">Recherche</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Morceaux, albums, covers, exercices, matos et amis — au même endroit.
        </p>
      </div>

      <div className="relative">
        <span
          aria-hidden="true"
          className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-muted-foreground"
        >
          search
        </span>
        <input
          // On vient sur cet ecran pour taper : le champ prend le focus.
          autoFocus
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Chercher…"
          aria-label="Rechercher dans toute l'app"
          className="min-h-[52px] w-full rounded-xl border border-input bg-card py-3 pl-11 pr-4 text-[15px] focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
      </div>

      <SearchResults
        groups={groups}
        query={query}
        isSearching={isSearching}
        placeholder={
          <p className="px-1 py-8 text-center text-sm text-muted-foreground">
            Tape au moins deux caractères.
          </p>
        }
      />
    </div>
  );
}
