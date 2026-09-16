import { OfflineView } from "@/components/offline/offline-view";

export const metadata = {
  title: "Hors ligne | Ostinara",
  description: "Ta bibliothèque et ton journal, sans réseau",
};

/**
 * Le repli hors ligne du service worker.
 *
 * Volontairement statique : c'est la page que le service worker sert
 * quand une navigation echoue. Elle ne peut donc rien demander au
 * serveur — tout son contenu vient d'IndexedDB, cote client.
 *
 * `force-static` n'est pas un detail : une page dynamique ne serait pas
 * pre-rendue au build, donc pas mise en cache a l'installation, donc
 * absente au moment exact ou on en a besoin.
 */
export const dynamic = "force-static";

export default function OfflinePage() {
  return <OfflineView />;
}
