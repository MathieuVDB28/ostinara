import { DEFAULT_LOCALE, type Locale } from "./config";

/**
 * Pays ou l'on sert le francais d'office, d'apres le pays de l'IP.
 *
 * Les pays bilingues (Belgique, Suisse, Canada, Luxembourg…) n'y sont pas :
 * le pays n'y dit pas la langue, c'est le navigateur qui tranche.
 */
const FRENCH_COUNTRIES = new Set([
  "FR", "MC", "RE", "GP", "MQ", "GF", "YT", "PM", "NC", "PF", "WF", "BL", "MF",
  "SN", "CI", "ML", "BF", "NE", "TG", "BJ", "GN", "CM", "GA", "CG", "CD", "CF",
  "TD", "MG", "DJ", "KM", "BI", "RW", "HT",
  // Le Maghreb : le francais y est la langue des apps plus souvent que l'anglais.
  "MA", "DZ", "TN",
]);

const MULTILINGUAL_COUNTRIES = new Set(["BE", "CH", "CA", "LU", "SC", "VU", "MU", "LB"]);

/** La premiere langue du navigateur que l'on sait servir. */
function fromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const tags = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .filter(({ tag }) => tag && tag !== "*")
    .sort((a, b) => b.q - a.q);
  for (const { tag } of tags) {
    if (tag.startsWith("fr")) return "fr";
    if (tag.startsWith("en")) return "en";
  }
  return null;
}

/**
 * La langue d'un premier visiteur.
 *
 * 1. Pays de l'IP (en-tete x-vercel-ip-country, pose par Vercel) : francais
 *    dans les pays francophones, anglais ailleurs ;
 * 2. pays bilingue, ou pas d'en-tete (en local) : la langue du navigateur ;
 * 3. a defaut, le francais.
 */
export function detectLocale(headers: Headers): Locale {
  const country = headers.get("x-vercel-ip-country")?.toUpperCase() ?? null;
  const browser = fromAcceptLanguage(headers.get("accept-language"));

  if (country && !MULTILINGUAL_COUNTRIES.has(country)) {
    return FRENCH_COUNTRIES.has(country) ? "fr" : "en";
  }
  return browser ?? DEFAULT_LOCALE;
}
