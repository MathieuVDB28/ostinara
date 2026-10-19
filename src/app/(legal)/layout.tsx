import Link from "next/link";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";

export default async function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("legal");
  const locale = await getLocale();
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar */}
      <nav className="fixed top-0 right-0 left-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="" width={32} height={32} className="rounded-md" />
            <span className="font-display text-2xl font-extrabold uppercase leading-none tracking-[0.02em]">
              Ostinara
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <LocaleSwitcher className="hidden sm:flex" />
            <Link
              href="/login"
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("layout.login")}
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {t("layout.start")}
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 pt-16">
        {/* Les textes anglais sont des traductions : le francais reste le texte de reference. */}
        {locale !== "fr" && (
          <p className="border-b border-border bg-secondary px-6 py-3 text-center text-sm text-muted-foreground">
            {t("binding")}
          </p>
        )}
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Ostinara"
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                <span className="font-semibold">Ostinara</span>
                <span className="text-xs text-muted-foreground italic">
                  stay tuned
                </span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <Link
                href="/mentions-legales"
                className="transition-colors hover:text-foreground"
              >
                {t("layout.notice")}
              </Link>
              <Link
                href="/cgu"
                className="transition-colors hover:text-foreground"
              >
                {t("layout.terms")}
              </Link>
              <Link
                href="/politique-confidentialite"
                className="transition-colors hover:text-foreground"
              >
                {t("layout.privacy")}
              </Link>
              <Link
                href="mailto:contact@ostinara.app"
                className="transition-colors hover:text-foreground"
              >
                {t("layout.contact")}
              </Link>
            </div>
            <div className="text-sm text-muted-foreground">
              {t("layout.rights", { year })}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
