import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { presentationVideo } from "@/lib/install-videos";

/**
 * La presentation video de l'app (projet Remotion de video/), et le lien
 * vers le tuto d'installation. Lecture a la demande : pas de
 * telechargement tant qu'on ne touche pas Lecture.
 */
export function DemoVideoSection() {
  const t = useTranslations("install.landing");
  const video = presentationVideo(useLocale());
  const accent = (chunks: React.ReactNode) => <span className="text-primary">{chunks}</span>;

  return (
    <section id="video" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t("eyebrow")}</p>
        <h2 className="mt-3 max-w-3xl font-display text-5xl font-extrabold uppercase leading-[0.9] sm:text-6xl">
          {t.rich("title", { accent })}
        </h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">{t("body")}</p>

        <video
          src={video.src}
          poster={video.poster}
          controls
          playsInline
          preload="none"
          className="mt-10 aspect-video w-full rounded-xl border border-border bg-muted"
        />

        <div className="mt-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-2xl font-extrabold uppercase leading-none">{t("installTitle")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("installBody")}</p>
          </div>
          <Link
            href="/installer"
            className="group inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl border border-input px-6 font-semibold hover:bg-accent"
          >
            {t("installCta")}
            <Icon name="arrow_forward" className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
