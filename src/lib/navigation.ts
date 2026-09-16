/**
 * Source unique de la navigation principale.
 *
 * Quatre destinations de premier niveau, chacune decoupee en segments.
 * La barre du bas (mobile) et la sidebar (desktop) lisent toutes les deux
 * ce fichier : il n'y a plus deux listes a garder synchronisees.
 *
 * Regle : un onglet est une destination, jamais une action. Le tiroir
 * "Plus" a disparu — il masquait 8 sections derriere un bouton qui
 * n'etait pas une page.
 *
 * "Recherche" respecte cette regle : c'est /recherche, une page, pas
 * l'ouverture d'un champ. Elle n'existe que sur mobile — sur desktop le
 * meme service passe par la palette cmd-K, que la sidebar affiche en
 * tete. D'ou `mobileOnly` : la liste reste unique, chaque barre decide
 * ce qu'elle en montre.
 */

export type BadgeKey = "friends" | "challenges" | "bands";

export interface NavSegment {
  href: string;
  label: string;
  icon: string;
  badgeKey?: BadgeKey;
}

export interface NavTab {
  href: string;
  label: string;
  icon: string;
  /** Segments servis par des routes distinctes. Vide = segments client. */
  segments: NavSegment[];
  badgeKeys?: BadgeKey[];
  /** Absent de la sidebar : le desktop a un meilleur chemin (cmd-K). */
  mobileOnly?: boolean;
}

export const NAV_TABS: NavTab[] = [
  {
    href: "/jouer",
    label: "Jouer",
    icon: "metronome",
    // Les segments de /jouer sont du state client : le metronome et le
    // chrono de session doivent survivre au changement d'onglet.
    segments: [],
  },
  {
    href: "/recherche",
    label: "Recherche",
    icon: "search",
    mobileOnly: true,
    segments: [],
  },
  {
    href: "/biblio",
    label: "Biblio",
    icon: "library",
    segments: [
      { href: "/biblio", label: "Morceaux", icon: "library" },
      { href: "/biblio/albums", label: "Albums", icon: "album" },
      { href: "/biblio/covers", label: "Covers", icon: "video" },
    ],
  },
  {
    href: "/commu",
    label: "Commu",
    icon: "social",
    badgeKeys: ["friends", "challenges", "bands"],
    segments: [
      { href: "/commu", label: "Feed", icon: "feed" },
      // Les covers ont quitte la bibliotheque pour la communaute : c'est
      // le seul contenu de l'app qu'on publie pour etre vu, pas pour
      // s'en souvenir. « Biblio › Covers » reste l'archive personnelle.
      { href: "/commu/covers", label: "Covers", icon: "video" },
      { href: "/commu/amis", label: "Amis", icon: "users", badgeKey: "friends" },
      { href: "/commu/defis", label: "Défis", icon: "trophy", badgeKey: "challenges" },
      { href: "/commu/groupes", label: "Groupes", icon: "setlist", badgeKey: "bands" },
    ],
  },
  {
    href: "/profil",
    label: "Profil",
    icon: "person",
    segments: [
      { href: "/profil", label: "Progression", icon: "chart" },
      { href: "/profil/matos", label: "Matos", icon: "guitar" },
      { href: "/profil/reglages", label: "Réglages", icon: "settings" },
    ],
  },
];

/** Compteurs de badge, resolus une fois cote serveur dans le layout. */
export type BadgeCounts = Partial<Record<BadgeKey, number>>;

/** Un href couvre-t-il le chemin courant (lui-meme ou un de ses enfants) ? */
export function coversPath(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

/** L'onglet de premier niveau actif, ou undefined hors des quatre onglets. */
export function activeTab(pathname: string): NavTab | undefined {
  return NAV_TABS.find((tab) => coversPath(tab.href, pathname));
}

/**
 * Le segment actif d'un onglet : le prefixe correspondant le plus long.
 * Sans ca "/biblio" (segment index) gagnerait sur "/biblio/albums".
 */
export function activeSegment(
  tab: NavTab,
  pathname: string
): NavSegment | undefined {
  return tab.segments
    .filter((segment) => coversPath(segment.href, pathname))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

/** Total des badges d'un onglet, pour la pastille de la barre du bas. */
export function tabBadgeTotal(tab: NavTab, counts: BadgeCounts): number {
  return (tab.badgeKeys ?? []).reduce(
    (sum, key) => sum + (counts[key] ?? 0),
    0
  );
}

/** Les onglets affiches par la sidebar desktop. */
export const DESKTOP_TABS: NavTab[] = NAV_TABS.filter((tab) => !tab.mobileOnly);
