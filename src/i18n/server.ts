import { getLocale, getTranslations } from "next-intl/server";
import type { Translator } from "./types";
import { DEFAULT_LOCALE, INTL_LOCALE, isLocale, type Locale } from "./config";

/** La balise Intl de la requete, cote serveur (pages async, actions). */
export async function getIntlLocale() {
  return INTL_LOCALE[await getLocale()];
}

/**
 * La langue d'un destinataire (profiles.locale), francais a defaut.
 *
 * Push, cron et emails partent dans la langue de qui les recoit, pas de
 * qui les declenche : on passe le resultat a
 * getTranslations({ locale, namespace }).
 */
export function recipientLocale(locale: string | null | undefined): Locale {
  return isLocale(locale) ? locale : DEFAULT_LOCALE;
}

type ErrorKey = Parameters<Translator<"errors">>[0];

/**
 * Un message d'erreur rendu par une Server Action ou une route API, dans
 * la langue de la requete : `return { success: false, error: await tErr("notAuthenticated") }`.
 */
export async function tErr(key: ErrorKey, values?: Record<string, string | number>): Promise<string> {
  const t = await getTranslations("errors");
  return t(key, values as never);
}
