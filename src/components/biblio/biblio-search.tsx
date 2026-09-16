"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

interface BiblioSearchValue {
  query: string;
  setQuery: (value: string) => void;
}

const BiblioSearchContext = createContext<BiblioSearchValue | null>(null);

/**
 * Une seule recherche pour toute la bibliotheque.
 *
 * L'app comptait 14 champs de recherche locaux et aucun point d'entree
 * unique. Le champ vit dans le layout de /biblio : il survit au passage
 * Morceaux -> Albums -> Covers, et chaque segment le lit via ce contexte
 * plutot que de repasser par le serveur a chaque frappe.
 */
export function BiblioSearchProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();

  /*
   * `?q=` amorce le champ. Les albums n'ont pas de fiche propre : un
   * resultat de la recherche globale atterrit donc sur le segment Albums
   * deja filtre sur son nom. L'amorce ne vaut qu'au montage — ensuite,
   * c'est le champ qui mene, pas l'URL.
   */
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const value = useMemo(() => ({ query, setQuery }), [query]);

  return (
    <BiblioSearchContext.Provider value={value}>
      {children}
    </BiblioSearchContext.Provider>
  );
}

export function useBiblioSearch(): BiblioSearchValue {
  const context = useContext(BiblioSearchContext);
  if (!context) {
    throw new Error("useBiblioSearch doit être utilisé dans BiblioSearchProvider");
  }
  return context;
}

const PLACEHOLDERS: Record<string, string> = {
  "/biblio": "Rechercher un morceau…",
  "/biblio/albums": "Rechercher un album…",
  "/biblio/covers": "Rechercher une cover…",
};

export function BiblioSearchInput() {
  const { query, setQuery } = useBiblioSearch();
  const pathname = usePathname();

  // Le placeholder dit ce qui est cherche : sans ca on ne sait pas si la
  // recherche porte sur le segment courant ou sur toute la bibliotheque.
  const placeholder = PLACEHOLDERS[pathname] ?? "Rechercher…";

  return (
    <div className="relative w-full sm:w-72">
      <span
        aria-hidden="true"
        className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-muted-foreground"
      >
        search
      </span>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-h-[44px] w-full rounded-xl border border-input bg-card py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
      />
    </div>
  );
}
