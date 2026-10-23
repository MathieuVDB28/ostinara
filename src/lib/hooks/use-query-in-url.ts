"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Recopie une recherche dans `?q=` de l'adresse courante, sans navigation.
 *
 * La recherche vivait dans un `useState` : ouvrir un resultat puis faire
 * « Retour » rendait une page vide. Ecrite dans l'adresse, elle revient
 * avec l'entree d'historique — c'est elle que les pages relisent au
 * montage.
 *
 * `replaceState` et non `router.replace` : rien a recharger, et une frappe
 * ne doit pas ajouter d'entree a l'historique. Next synchronise son
 * routeur sur ces appels natifs.
 */
export function useQueryInUrl(query: string) {
  const pathname = usePathname();

  useEffect(() => {
    const url = new URL(window.location.href);
    if ((url.searchParams.get("q") ?? "") === query) return;
    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    // Le chemin compte aussi : passer de Morceaux a Albums garde la
    // recherche dans le champ, il faut la remettre dans la nouvelle adresse.
  }, [query, pathname]);
}
