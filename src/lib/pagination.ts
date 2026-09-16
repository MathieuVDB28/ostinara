/**
 * Tailles de page, dans un module neutre — ni "use client", ni "use server".
 *
 * `SESSIONS_PER_PAGE` vivait dans `progress-view.tsx`, qui porte
 * "use client". Un composant serveur qui importe un module client n'en
 * recoit pas les valeurs mais des *references* : la page de Progression
 * appelait donc `getPracticeSessions(undefined, <reference>)` et le
 * journal repartait sans aucune limite. La constante n'a pas de camp, elle
 * ne doit vivre dans aucun des deux.
 */

/**
 * Cinq sessions : le journal tient dans un ecran.
 *
 * Vingt, c'etait encore trois ecrans de defilement avant d'atteindre le
 * bas de la page. La suite se charge a la demande — pas de numeros de
 * page : un journal se lit dans l'ordre, on ne saute pas a la page 7.
 */
export const SESSIONS_PER_PAGE = 5;
