"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { SearchResults } from "./search-results";
import { flattenGroups, useGlobalSearch } from "./use-global-search";
import { Icon } from "@/components/ui/icon";

/**
 * La palette de commande — cmd-K, ou ctrl-K.
 *
 * Sur mobile, le meme service est rendu par l'onglet Recherche : une
 * palette flottante n'a pas de sens au doigt, et « one clearly identified
 * location » veut dire un endroit, pas une combinaison de touches que
 * personne ne devine sur telephone.
 */

interface CommandPaletteValue {
  open: () => void;
  isOpen: boolean;
}

const CommandPaletteContext = createContext<CommandPaletteValue | null>(null);

export function useCommandPalette(): CommandPaletteValue {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error(
      "useCommandPalette doit être utilisé dans CommandPaletteProvider"
    );
  }
  return context;
}

/** Les raccourcis proposes avant la premiere frappe. */
const QUICK_LINKS = [
  { href: "/accueil", label: "nav.home", icon: "home" },
  { href: "/jouer", label: "nav.play", icon: "timer" },
  { href: "/biblio", label: "search.ui.library", icon: "music_note" },
  { href: "/biblio/covers", label: "nav.covers", icon: "videocam" },
  { href: "/commu/defis", label: "nav.challenges", icon: "emoji_events" },
  { href: "/profil/matos", label: "nav.gear", icon: "tune" },
  { href: "/profil", label: "nav.progress", icon: "bar_chart" },
] as const;

/**
 * La recherche en cours, gardee dans l'entree d'historique de la page d'ou
 * l'on ouvre un resultat. « Retour » y ramene : la palette se rouvre avec
 * sa recherche au lieu de laisser la page nue. Next recopie son propre
 * etat dans ce que l'on passe a `replaceState`.
 */
const HISTORY_KEY = "paletteQuery";

function rememberQuery(query: string | null) {
  window.history.replaceState(query ? { [HISTORY_KEY]: query } : null, "");
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState("");
  // Le focus revient d'ou il vient : fermer la palette ne doit pas renvoyer
  // au debut de la page.
  const opener = useRef<HTMLElement | null>(null);

  const open = useCallback(() => {
    opener.current = document.activeElement as HTMLElement | null;
    setInitialQuery("");
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    opener.current?.focus?.();
    opener.current = null;
  }, []);

  // Fermee sans rien choisir : la recherche est abandonnee, un prochain
  // retour sur cette page ne doit pas la ressortir.
  const dismiss = useCallback(() => {
    rememberQuery(null);
    close();
  }, [close]);

  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      const query = (event.state as Record<string, unknown> | null)?.[HISTORY_KEY];
      if (typeof query !== "string" || !query) return;
      opener.current = null;
      setInitialQuery(query);
      setIsOpen(true);
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k") return;
      if (!event.metaKey && !event.ctrlKey) return;
      event.preventDefault();
      // Une bascule : le meme raccourci ouvre et referme.
      if (isOpen) dismiss();
      else open();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dismiss, isOpen, open]);

  const value = useMemo(() => ({ open, isOpen }), [open, isOpen]);

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      {isOpen && (
        <CommandPalette
          key={initialQuery}
          initialQuery={initialQuery}
          onNavigate={close}
          onDismiss={dismiss}
        />
      )}
    </CommandPaletteContext.Provider>
  );
}

function CommandPalette({
  initialQuery,
  onNavigate,
  onDismiss,
}: {
  initialQuery: string;
  /** Un resultat choisi : la palette se ferme, la page change. */
  onNavigate: () => void;
  /** Echap ou clic a cote : rien n'a ete choisi. */
  onDismiss: () => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { groups, isSearching } = useGlobalSearch(query);
  const flat = useMemo(() => flattenGroups(groups), [groups]);

  // Une nouvelle liste repart du premier resultat : garder l'index precedent
  // designerait une ligne qui n'a plus rien a voir. La remise a zero se fait
  // pendant le rendu — un effet ferait clignoter la selection d'une frame.
  const [renderedGroups, setRenderedGroups] = useState(groups);
  if (groups !== renderedGroups) {
    setRenderedGroups(groups);
    setActiveIndex(0);
  }

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Avant de quitter la page : la recherche reste dans son entree
  // d'historique, pour la retrouver au retour.
  const select = useCallback(() => {
    rememberQuery(query.trim() ? query : null);
    onNavigate();
  }, [onNavigate, query]);

  // Le corps ne defile pas derriere la palette.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onDismiss();
        return;
      }

      if (flat.length === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % flat.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + flat.length) % flat.length);
      } else if (event.key === "Enter") {
        event.preventDefault();
        const target = flat[activeIndex];
        if (!target) return;
        select();
        router.push(target.href);
      }
    },
    [activeIndex, flat, onDismiss, router, select]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onDismiss}
        className="absolute inset-0 cursor-default bg-foreground/40 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("search.ui.title")}
        className="relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-popover shadow-md"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Icon name="search" className="h-6 w-6 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={flat.length > 0}
            aria-controls="palette-results"
            aria-activedescendant={
              flat.length > 0 ? `palette-result-${activeIndex}` : undefined
            }
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("search.ui.palettePlaceholder")}
            aria-label={t("search.ui.ariaLabel")}
            className="min-h-[56px] flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground sm:block">
            {t("search.ui.escape")}
          </kbd>
        </div>

        <div
          id="palette-results"
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto p-2"
        >
          <SearchResults
            groups={groups}
            query={query}
            isSearching={isSearching}
            activeIndex={activeIndex}
            idPrefix="palette-result"
            onSelect={select}
            placeholder={
              <div>
                <h2 className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("search.ui.goTo")}
                </h2>
                <ul className="space-y-0.5">
                  {QUICK_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={select}
                        className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-accent"
                      >
                        <Icon name={link.icon} className="h-5 w-5 text-muted-foreground" />
                        {t(link.label)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            }
          />
        </div>

        <p className="hidden border-t border-border px-4 py-2 text-[11px] text-muted-foreground sm:block">
          {t("search.ui.hints")}
        </p>
      </div>
    </div>
  );
}
