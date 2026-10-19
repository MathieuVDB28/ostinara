import { useLocale } from "next-intl";
import { INTL_LOCALE } from "./config";

/**
 * La balise a passer a toLocaleDateString / Intl.NumberFormat…
 * (« fr-FR » ou « en-US »). Composants client ou serveur synchrones.
 */
export function useIntlLocale() {
  return INTL_LOCALE[useLocale()];
}
