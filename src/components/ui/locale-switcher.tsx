"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/lib/actions/locale";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/i18n/config";

/**
 * FR / EN. Sur les pages publiques (auth, landing, legal) en version
 * compacte ; dans Reglages en version longue (noms complets).
 */
export function LocaleSwitcher({ variant = "compact", className = "" }: {
  variant?: "compact" | "full";
  className?: string;
}) {
  const t = useTranslations("common");
  const current = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const choose = (locale: Locale) => {
    if (locale === current) return;
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  };

  return (
    <div
      role="radiogroup"
      aria-label={t("language")}
      className={`flex items-center gap-1 rounded-xl border border-border p-1 ${pending ? "opacity-60" : ""} ${className}`}
    >
      {LOCALES.map((locale) => {
        const isActive = locale === current;
        return (
          <button
            key={locale}
            type="button"
            role="radio"
            aria-checked={isActive}
            lang={locale}
            disabled={pending}
            onClick={() => choose(locale)}
            className={`flex h-8 flex-1 items-center justify-center rounded-lg px-2.5 text-xs font-semibold transition-colors ${
              isActive
                ? "bg-secondary text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {variant === "full" ? LOCALE_NAMES[locale] : locale.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
