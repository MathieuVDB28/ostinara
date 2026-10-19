import { OfflineView } from "@/components/offline/offline-view";
import { OfflineIntl } from "@/components/offline/offline-intl";

export const metadata = {
  title: "Ostinara · Hors ligne / Offline",
  description: "Ta bibliothèque et ton journal, sans réseau · Your library and log, without a connection",
};

/**
 * Le repli hors ligne du service worker.
 *
 * Volontairement statique : c'est la page que le service worker sert
 * quand une navigation echoue. Elle ne peut donc rien demander au
 * serveur — tout son contenu vient d'IndexedDB, cote client. Pour la
 * meme raison, la langue se choisit cote client (OfflineIntl) et le titre
 * de l'onglet porte les deux.
 *
 * `force-static` n'est pas un detail : une page dynamique ne serait pas
 * pre-rendue au build, donc pas mise en cache a l'installation, donc
 * absente au moment exact ou on en a besoin.
 */
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <OfflineIntl>
      <OfflineView />
    </OfflineIntl>
  );
}
