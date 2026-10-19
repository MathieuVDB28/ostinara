"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/i18n/config";
import offlineFr from "../../../messages/fr/offline.json";
import offlineEn from "../../../messages/en/offline.json";
import commonFr from "../../../messages/fr/common.json";
import commonEn from "../../../messages/en/common.json";

const MESSAGES = {
  fr: { offline: offlineFr, common: commonFr },
  en: { offline: offlineEn, common: commonEn },
} as const;

/** La langue du cookie, a defaut celle du navigateur. */
function clientLocale(): Locale {
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`));
  if (match && isLocale(match[1])) return match[1];
  return navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
}

/**
 * La page hors ligne est pre-rendue au build, sans cookie : elle sortirait
 * toujours en francais. Elle embarque donc ses quelques messages dans les
 * deux langues et choisit au montage, comme le reste de l'app l'aurait fait.
 */
const noSubscribe = () => () => {};

export function OfflineIntl({ children }: { children: ReactNode }) {
  // Le rendu du build sort en francais ; au montage, React relit la
  // langue du navigateur et rerend sans erreur d'hydratation.
  const locale = useSyncExternalStore(noSubscribe, clientLocale, () => DEFAULT_LOCALE);

  return (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}
