import type { Locale } from "@/i18n/config";
import type messages from "../messages/fr";

// Les cles de traduction sont typees d'apres le francais (la langue
// source) : une cle absente ou mal orthographiee ne compile pas.
// scripts/check-i18n.mjs verifie que l'anglais a exactement les memes.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
