"use client";

import {
  Suspense,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

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
  const [query, setQuery] = useState("");
  const value = useMemo(() => ({ query, setQuery }), [query]);

  return (
    <BiblioSearchContext.Provider value={value}>
      {/*
        La lecture de `?q=` est isolee dans sa propre frontiere Suspense.
        Quand c'etait le fournisseur lui-meme qui appelait
        useSearchParams(), le rendu serveur de /biblio echouait
        (« useBiblioSearch doit etre utilise dans BiblioSearchProvider »)
        et toute la page se rattrapait cote client.
      */}
      <Suspense fallback={null}>
        <QuerySeed onSeed={setQuery} />
      </Suspense>
      {children}
    </BiblioSearchContext.Provider>
  );
}

/**
 * `?q=` amorce le champ. Les albums n'ont pas de fiche propre : un
 * resultat de la recherche globale atterrit donc sur le segment Albums
 * deja filtre sur son nom. L'amorce ne vaut qu'une fois — ensuite, c'est
 * le champ qui mene, pas l'URL.
 */
function QuerySeed({ onSeed }: { onSeed: (value: string) => void }) {
  const seed = useSearchParams().get("q");
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current || !seed) return;
    seeded.current = true;
    onSeed(seed);
  }, [seed, onSeed]);

  return null;
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

/**
 * Sur mobile, le champ se replie en une loupe a cote du titre : il
 * occupait une rangee entiere au-dessus des sections. Il se deplie au
 * toucher, et reste ouvert tant qu'il contient une recherche.
 */
export function BiblioSearchInput() {
  const { query, setQuery } = useBiblioSearch();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Le placeholder dit ce qui est cherche : sans ca on ne sait pas si la
  // recherche porte sur le segment courant ou sur toute la bibliotheque.
  const placeholder = PLACEHOLDERS[pathname] ?? "Rechercher…";
  const expanded = open || query !== "";

  return (
    <div className={`ml-auto flex items-center ${expanded ? "min-w-0 flex-1 sm:flex-none" : ""}`}>
      {!expanded && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          aria-label={placeholder}
          className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent sm:hidden"
        >
          <Search className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </button>
      )}
      <div className={`relative w-full sm:w-72 ${expanded ? "block" : "hidden sm:block"}`}>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onBlur={() => setOpen(false)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="min-h-[40px] w-full rounded-xl border border-border bg-card py-2 pl-9 pr-9 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 [&::-webkit-search-cancel-button]:hidden"
        />
        {query !== "" && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Effacer la recherche"
            className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
