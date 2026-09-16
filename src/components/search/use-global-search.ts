"use client";

import { useEffect, useRef, useState } from "react";
import { searchEverything } from "@/lib/actions/search";
import type { SearchResultGroup } from "@/types";

/** Le temps de finir un mot avant de partir en base. */
const DEBOUNCE_MS = 200;

/** Meme seuil que cote serveur : deux caracteres ramenent tout. */
export const MIN_QUERY_LENGTH = 2;

interface Fetched {
  /** La requete a laquelle ce resultat repond. */
  query: string;
  groups: SearchResultGroup[];
}

const NOTHING: Fetched = { query: "", groups: [] };

/**
 * La recherche globale, cote client.
 *
 * Deux choses a tenir. Ne pas interroger la base a chaque frappe — d'ou
 * l'attente. Et ne jamais afficher une reponse doublee par une plus
 * recente : taper « bla » puis « black » peut tres bien faire revenir
 * « bla » en dernier.
 *
 * Le resultat porte donc la requete a laquelle il repond, et « en cours
 * de recherche » se deduit de leur ecart plutot que de vivre dans un etat
 * a part, qui finirait par mentir.
 */
export function useGlobalSearch(query: string) {
  const trimmed = query.trim();
  const isTooShort = trimmed.length < MIN_QUERY_LENGTH;

  const [fetched, setFetched] = useState<Fetched>(NOTHING);
  const latestRequest = useRef(0);

  useEffect(() => {
    if (isTooShort) return;

    const requestId = ++latestRequest.current;

    const timeout = setTimeout(() => {
      void searchEverything(trimmed)
        .then((groups) => {
          if (requestId !== latestRequest.current) return;
          setFetched({ query: trimmed, groups });
        })
        .catch(() => {
          if (requestId !== latestRequest.current) return;
          setFetched({ query: trimmed, groups: [] });
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [trimmed, isTooShort]);

  const isUpToDate = !isTooShort && fetched.query === trimmed;

  return {
    groups: isUpToDate ? fetched.groups : [],
    isSearching: !isTooShort && !isUpToDate,
  };
}

/** Les resultats a plat, dans l'ordre affiche — c'est l'ordre du clavier. */
export function flattenGroups(groups: SearchResultGroup[]) {
  return groups.flatMap((group) => group.results);
}
