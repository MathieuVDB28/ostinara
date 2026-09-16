/**
 * Effacer la trace locale d'un compte.
 *
 * Depuis que l'app garde une copie de la bibliotheque et du journal, et
 * que le service worker met les navigations en cache, une deconnexion
 * doit faire le menage : sur un telephone partage, la personne suivante
 * ne doit pas retrouver la bibliotheque de la precedente en coupant le
 * reseau.
 *
 * Tout est en `try/catch` et sans valeur de retour : un menage qui echoue
 * ne doit jamais empecher une deconnexion.
 */

import { clearQueue, clearSnapshot } from "./db";

/** Les caches du service worker qui portent des donnees de compte. */
const ACCOUNT_CACHES = ["pages", "offline-snapshot", "supabase-api"];

export async function purgeOfflineData(): Promise<void> {
  try {
    await Promise.all([clearSnapshot(), clearQueue()]);
  } catch {
    // IndexedDB indisponible : il n'y avait rien a effacer.
  }

  try {
    if (typeof caches === "undefined") return;
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => ACCOUNT_CACHES.some((prefix) => name.includes(prefix)))
        .map((name) => caches.delete(name))
    );
  } catch {
    // Stockage bloque : rien de plus a faire ici.
  }
}
