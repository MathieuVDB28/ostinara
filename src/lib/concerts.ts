/**
 * Concerts (setlists de groupe datees) et page publique du groupe (F7) :
 * regles partagees client / serveur. La base (migration
 * 20261201_band_public_pages) reste seule a faire foi.
 */

export const CONCERT_CITY_MAX = 120;
export const CONCERT_URL_MAX = 2000;
/** Comme la contrainte bands_slug_format. */
export const BAND_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/;

export function bandPublicHref(slug: string): string {
  return `/groupe/${slug}`;
}

/** Le jour de Paris, « AAAA-MM-JJ » : un concert du jour est encore a venir. */
export function parisToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
}

export function isUpcomingConcert(date: string, now = new Date()): boolean {
  return date >= parisToday(now);
}

/** Un lien de billetterie : http(s) seulement, sinon null. */
export function cleanTicketUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) && trimmed.length <= CONCERT_URL_MAX ? trimmed : null;
}

/** « 20:30:00 » → « 20:30 ». */
export function shortTime(value: string | null | undefined): string | null {
  return value ? value.slice(0, 5) : null;
}

/** « vendredi 20 novembre 2026 », la date seule sans decalage de fuseau. */
export function formatConcertDate(date: string, locale: string, style: "long" | "short" = "long"): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    ...(style === "long"
      ? { weekday: "long", day: "numeric", month: "long", year: "numeric" }
      : { day: "numeric", month: "short", year: "numeric" }),
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Ce que la saisie d'une adresse devient : minuscules, tirets, sans accents. */
export function normalizeSlugInput(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 60);
}
