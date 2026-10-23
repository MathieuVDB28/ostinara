"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Recopie un etat d'ecran (recherche, onglet, filtre…) dans un parametre
 * de l'adresse courante, sans navigation. Une valeur vide retire le
 * parametre.
 *
 * Ces etats vivaient dans un `useState` : ouvrir un album puis faire
 * « Retour » rendait l'ecran par defaut. Ecrits dans l'adresse, ils
 * reviennent avec l'entree d'historique — c'est elle que les pages
 * relisent au montage.
 *
 * `replaceState` et non `router.replace` : rien a recharger, et une frappe
 * ne doit pas ajouter d'entree a l'historique. Next synchronise son
 * routeur sur ces appels natifs.
 */
export function useParamInUrl(name: string, value: string) {
  const pathname = usePathname();

  useEffect(() => {
    const url = new URL(window.location.href);
    if ((url.searchParams.get(name) ?? "") === value) return;
    if (value) url.searchParams.set(name, value);
    else url.searchParams.delete(name);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    // Le chemin compte aussi : passer de Morceaux a Albums garde la
    // recherche dans le champ, il faut la remettre dans la nouvelle adresse.
  }, [name, value, pathname]);
}
