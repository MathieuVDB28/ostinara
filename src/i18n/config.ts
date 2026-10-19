/**
 * Les langues de l'app.
 *
 * Pas de prefixe dans les URL : la langue vit dans le cookie NEXT_LOCALE
 * (lu par src/i18n/request.ts) et sur le profil (profiles.locale, pour ce
 * qui part sans requete : push, emails, cron). Le cookie est pose a la
 * premiere visite par le middleware, d'apres le pays de l'IP et la langue
 * du navigateur (src/i18n/detect.ts), puis par le choix fait dans Reglages.
 *
 * Fichier partage client + serveur : rien d'autre que des constantes.
 */

export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

export const LOCALE_COOKIE = "NEXT_LOCALE";
/** Un an : le choix d'une langue ne se refait pas a chaque visite. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** La balise BCP 47 passee a Intl (dates, nombres, devises). */
export const INTL_LOCALE: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-US",
};

export const LOCALE_NAMES: Record<Locale, string> = {
  fr: "Français",
  en: "English",
};
