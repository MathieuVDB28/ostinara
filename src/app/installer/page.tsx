import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { Icon } from "@/components/ui/icon";
import { InstallView } from "@/components/install/install-view";
import { installVideo } from "@/lib/install-videos";
import { siteUrl } from "@/lib/blog/categories";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("install.meta");
  return {
    metadataBase: new URL(siteUrl()),
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/installer" },
    openGraph: { title: t("title"), description: t("description"), type: "website", siteName: "Ostinara" },
  };
}

/**
 * Installer l'app sur l'ecran d'accueil (iPhone et Android), avec le tuto
 * video. Publique : c'est le lien qu'on envoie a quelqu'un qui n'a pas
 * encore de compte. Le telephone est reconnu cote client (InstallView).
 */
export default async function InstallerPage() {
  const t = await getTranslations("install");
  const locale = await getLocale();
  const accent = (chunks: React.ReactNode) => <span className="text-primary">{chunks}</span>;

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="" width={32} height={32} className="rounded-md" />
            <span className="font-display text-2xl font-extrabold uppercase leading-none tracking-[0.02em]">Ostinara</span>
          </Link>
          <LocaleSwitcher />
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-5 pb-20 pt-12 sm:pt-16">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t("eyebrow")}</p>
        <h1 className="mt-4 font-display text-[clamp(52px,10vw,104px)] font-extrabold uppercase leading-[0.88]">
          {t.rich("title", { accent })}
        </h1>
        <p className="mt-5 max-w-2xl font-serif text-lg italic leading-relaxed text-foreground/80">{t("lead")}</p>

        <div className="mt-10">
          <InstallView video={installVideo(locale)} />
        </div>

        <section className="mt-16 border-t border-border pt-10">
          <h2 className="font-display text-4xl font-extrabold uppercase leading-none">{t("after.title")}</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">{t("after.body")}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-primary px-7 font-bold text-primary-foreground hover:opacity-90"
            >
              {t("after.cta")}
              <Icon name="arrow_forward" className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-[52px] items-center justify-center rounded-xl border border-border px-7 font-semibold hover:bg-accent"
            >
              {t("after.login")}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
