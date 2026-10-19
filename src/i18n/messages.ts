import type { Locale } from "./config";

/** Les messages d'une langue, charges a la demande (cote serveur). */
export async function loadMessages(locale: Locale) {
  return locale === "en"
    ? (await import("../../messages/en")).default
    : (await import("../../messages/fr")).default;
}
