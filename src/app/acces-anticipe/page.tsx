import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { Icon } from "@/components/ui/icon";
import { Frets } from "@/components/ui/frets";
import { PLANS } from "@/lib/stripe/config";
import { PickPlanButton, WaitlistForm, WaitlistProvider } from "@/components/landing/waitlist";
import { getWaitlistCount } from "@/lib/actions/waitlist";
import { EARLY_BIRD } from "@/lib/waitlist";
import type { UserPlan } from "@/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing.early.meta");
  const locale = await getLocale();
  return {
    // URL absolue de l'image d'apercu (opengraph-image.tsx).
    metadataBase: process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL) : undefined,
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      type: "website",
      locale: locale === "en" ? "en_US" : "fr_FR",
      siteName: "Ostinara",
    },
    twitter: { card: "summary_large_image" },
  };
}

/*
 * Les trois onglets de l'app, dans leurs mots (cf. src/lib/navigation.ts),
 * chacun dans le style de son domaine (docs/refonte-ui.md).
 */
const domains = [
  { key: "play", icon: "metronome" },
  { key: "library", icon: "library_music" },
  { key: "community", icon: "videocam" },
] as const;

/* Tout ce qu'il y a dans l'app, en lignes a filets. */
const toolbox = [
  { key: "metronome", icon: "metronome" },
  { key: "tuner", icon: "tuner" },
  { key: "sessions", icon: "timer" },
  { key: "progress", icon: "chart" },
  { key: "exercises", icon: "exercise" },
  { key: "routines", icon: "repeat" },
  { key: "setlists", icon: "setlist" },
  { key: "bands", icon: "groups" },
  { key: "recognition", icon: "audiotrack" },
  { key: "challenges", icon: "trophy" },
] as const;

/* Le calendrier de pratique du Carnet : 15 semaines, intensite 0-3. */
const calendar = Array.from({ length: 15 * 7 }, (_, i) => {
  const wave = Math.sin(i * 0.9) + Math.sin(i * 0.37) + (i / 105) * 1.6;
  return wave < -0.6 ? 0 : wave < 0.4 ? 1 : wave < 1.3 ? 2 : 3;
});
const calendarShade = ["bg-muted", "bg-primary/25", "bg-primary/55", "bg-primary"];

const shelf = [
  { title: "Blackbird", artist: "The Beatles", status: "learning", bpm: "84/96", value: 72 },
  { title: "Wish You Were Here", artist: "Pink Floyd", status: "learning", bpm: "60/62", value: 92 },
  { title: "Little Wing", artist: "Jimi Hendrix", status: "wantToLearn", bpm: "—/70", value: 8 },
] as const;

const faq = ["offer", "when", "pay", "phone", "beginner", "band"] as const;

const planOrder: UserPlan[] = ["free", "pro", "band"];

/**
 * La landing du lancement, a part de la page d'accueil : chaque appel a
 * l'action mene au formulaire email + plan (components/landing/waitlist).
 * Les liens partages sur les reseaux pointent ici (?ref=… pour la source).
 * Styles de l'app (docs/refonte-ui.md) : titres en capitales condensees
 * (Fanzine), chiffres et filets (Atelier), un seul aplat ambre par ecran.
 */
export default async function AccesAnticipe() {
  const t = await getTranslations("landing.early");
  const tp = await getTranslations("plans");
  const locale = await getLocale();
  const euros = (value: number) =>
    new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
  const accent = (chunks: React.ReactNode) => <span className="text-primary">{chunks}</span>;
  const footerLinks = [
    {
      title: t("footer.product"),
      links: [
        { label: t("footer.features"), href: "#features" },
        { label: t("footer.pricing"), href: "#tarifs" },
      ],
    },
    {
      title: t("footer.legal"),
      links: [
        { label: t("footer.legalNotice"), href: "/mentions-legales" },
        { label: t("footer.terms"), href: "/cgu" },
        { label: t("footer.privacy"), href: "/politique-confidentialite" },
      ],
    },
  ];
  const year = new Date().getFullYear();
  // null si le compteur est indisponible : l'offre s'affiche sans compteur.
  const taken = await getWaitlistCount();
  const spotsLeft = taken === null ? null : Math.max(0, EARLY_BIRD.spots - taken);
  const offerOpen = spotsLeft !== 0;

  return (
    <WaitlistProvider>
      <div className="min-h-screen bg-background">
        <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
            {/* Pas vers la home : elle ouvre l'inscription directe, hors liste. */}
            <Link href="#" className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="" width={32} height={32} className="rounded-md" />
              <span className="font-display text-2xl font-extrabold uppercase leading-none tracking-[0.02em]">
                Ostinara
              </span>
            </Link>
            <div className="flex items-center gap-1 sm:gap-2">
              <LocaleSwitcher className="mr-1" />
              <Link
                href="#tarifs"
                className="hidden rounded-full px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
              >
                {t("nav.pricing")}
              </Link>
              <Link
                href="#acces"
                className="whitespace-nowrap rounded-full border border-foreground px-4 py-2 text-sm font-bold transition-colors hover:bg-foreground hover:text-background"
              >
                <span className="sm:hidden">{t("nav.join")}</span>
                <span className="hidden sm:inline">{t("nav.early")}</span>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-end gap-12 px-5 pb-16 pt-12 sm:pt-20 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:pb-24">
          <div>
            <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              {t("hero.eyebrow")}
            </p>
            <h1 className="mt-4 font-display text-[clamp(64px,13vw,148px)] font-extrabold uppercase leading-[0.84] tracking-[-0.005em]">
              {t("hero.play")}
              <br />
              {t("hero.measure")}
              <br />
              <span className="text-primary">{t("hero.share")}</span>
            </h1>
            <p className="mt-6 max-w-xl font-serif text-lg italic leading-relaxed text-foreground/80 sm:text-xl">
              {t("hero.lead")}
            </p>
            {offerOpen && (
              <div className="mt-8 max-w-xl border-y border-border py-4">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-primary">
                    {t("hero.offer")}
                  </p>
                  {spotsLeft !== null && (
                    <p className="tabular font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {t("hero.spots", { left: spotsLeft, total: EARLY_BIRD.spots })}
                    </p>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-display text-3xl font-extrabold uppercase leading-[0.95]">
                      {t("hero.offerTitle", { months: EARLY_BIRD.months, spots: EARLY_BIRD.spots })}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("hero.offerHint")}
                    </p>
                  </div>
                  {spotsLeft !== null && (
                    <Frets
                      value={(spotsLeft / EARLY_BIRD.spots) * 100}
                      label={t("hero.spotsLeft", { left: spotsLeft, total: EARLY_BIRD.spots })}
                      className="hidden shrink-0 sm:inline-grid"
                    />
                  )}
                </div>
              </div>
            )}
            <div className="mt-6">
              <WaitlistForm id="hero" />
            </div>
          </div>

          {/*
            Un fragment de l'app plutot qu'une illustration : le tempo tenu
            sur un morceau, en frettes, comme dans le Carnet.
          */}
          <figure aria-hidden="true" className="border-y border-border py-6 lg:mb-24">
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t("hero.tempoHeld")}
            </p>
            <p className="tabular mt-2 font-display text-[112px] font-extrabold leading-[0.85]">
              92<span className="text-4xl text-muted-foreground">/104</span>
            </p>
            <div className="mt-4 flex items-center justify-between gap-4">
              <span className="font-display text-sm font-bold uppercase tracking-[0.06em] text-muted-foreground">
                {t("hero.bpmSong")}
              </span>
              <Frets value={73} className="origin-right scale-150" />
            </div>
            <dl className="mt-6 grid grid-cols-3 border-t border-border pt-4">
              {[
                [t("hero.streaks"), t("hero.streakValue")],
                [t("hero.thisMonth"), t("hero.monthValue")],
                [t("hero.mastered"), "23"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="tabular font-display text-3xl font-extrabold leading-none">{value}</dd>
                </div>
              ))}
            </dl>
          </figure>
        </section>

        {/* Le probleme, en une phrase */}
        <section className="border-t border-border bg-secondary">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
            <p className="max-w-4xl font-display text-[clamp(34px,5.5vw,64px)] font-extrabold uppercase leading-[0.95]">
              {t.rich("problem.title", { accent })}
            </p>
            <p className="mt-6 max-w-2xl font-serif text-lg italic leading-relaxed text-foreground/80">
              {t("problem.lead")}
            </p>
          </div>
        </section>

        {/* Les trois onglets */}
        <section id="features" className="scroll-mt-16 border-t border-border">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
            <h2 className="max-w-3xl font-display text-5xl font-extrabold uppercase leading-[0.9] sm:text-6xl">
              {t.rich("features.title", { accent })}
            </h2>

            <div className="mt-12 grid gap-px overflow-hidden border-y border-border bg-border lg:grid-cols-3">
              {domains.map((domain) => (
                <article key={domain.key} className="flex flex-col bg-background py-8 lg:px-6 lg:first:pl-0 lg:last:pr-0">
                  <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    <Icon name={domain.icon} className="h-4 w-4" />
                    {t(`domains.${domain.key}.tab`)}
                  </p>
                  <h3 className="mt-3 font-display text-3xl font-extrabold uppercase leading-[0.95]">
                    {t(`domains.${domain.key}.title`)}
                  </h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{t(`domains.${domain.key}.description`)}</p>
                  <div aria-hidden="true" className="mt-8 flex-1 border-t border-border pt-6">
                    {domain.key === "play" && <CalendarFragment />}
                    {domain.key === "library" && <ShelfFragment />}
                    {domain.key === "community" && <ReviewFragment />}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* La boite a outils */}
        <section className="border-t border-border">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <div>
              <h2 className="font-display text-5xl font-extrabold uppercase leading-[0.9] sm:text-6xl">
                {t.rich("toolboxTitle", { accent })}
              </h2>
              <p className="mt-4 max-w-sm leading-relaxed text-muted-foreground">
                {t("toolboxLead")}
              </p>
            </div>
            <ul className="grid border-t border-border sm:grid-cols-2 sm:gap-x-8">
              {toolbox.map((tool) => (
                <li key={tool.key} className="flex items-start gap-3 border-b border-border py-4">
                  <Icon name={tool.icon} className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-display text-xl font-extrabold uppercase leading-none">{t(`toolbox.${tool.key}.name`)}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(`toolbox.${tool.key}.detail`)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Tarifs */}
        <section id="tarifs" className="scroll-mt-16 border-t border-border">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="font-display text-5xl font-extrabold uppercase leading-[0.9] sm:text-6xl">
                {t.rich("pricing.title", { accent })}
              </h2>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                {t("pricing.lead")}
              </p>
            </div>

            <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {planOrder.map((plan) => {
                const config = PLANS[plan];
                const isPro = plan === "pro";
                return (
                  <div
                    key={plan}
                    className={`flex flex-col border-t-2 pt-5 ${isPro ? "border-foreground" : "border-border"}`}
                  >
                    <div className="mb-4 flex items-baseline justify-between gap-2">
                      <h3 className="font-display text-3xl font-extrabold uppercase leading-none">{config.name}</h3>
                      {isPro && (
                        <span className="rounded bg-foreground px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-background">
                          {t("pricing.popular")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{tp(`description.${plan}`)}</p>
                    <p className="tabular mb-5 mt-5 flex items-baseline">
                      <span className="font-display text-6xl font-extrabold leading-none">
                        {euros(config.monthly?.price ?? 0)}
                      </span>
                      {config.monthly && (
                        <span className="ml-1 text-sm font-semibold text-muted-foreground">{t("pricing.perMonth")}</span>
                      )}
                    </p>
                    <ul className="mb-6 flex-1 border-t border-border">
                      {config.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 border-b border-border py-2.5 text-sm">
                          <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={2.25} />
                          <span>{tp(`features.${feature}`)}</span>
                        </li>
                      ))}
                    </ul>
                    <PickPlanButton plan={plan} primary={isPro} />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-border">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <h2 className="font-display text-5xl font-extrabold uppercase leading-[0.9] sm:text-6xl">
              {t("faqTitle")}
            </h2>
            <div className="border-t border-border">
              {faq.map((item) => (
                <details key={item} className="group border-b border-border">
                  <summary className="flex min-h-[60px] cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-2xl font-extrabold uppercase leading-none [&::-webkit-details-marker]:hidden">
                    {t(`faq.${item}.q`)}
                    <Icon name="add" className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="max-w-2xl pb-5 leading-relaxed text-muted-foreground">{t(`faq.${item}.a`, { spots: EARLY_BIRD.spots, months: EARLY_BIRD.months })}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Appel final */}
        <section id="acces" className="scroll-mt-16 border-t border-border bg-secondary">
          <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-16 sm:py-24 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {t("final.eyebrow")}
              </p>
              <h2 className="mt-3 font-display text-5xl font-extrabold uppercase leading-[0.9] sm:text-7xl">
                {t.rich("final.title", { accent, br: () => <br /> })}
              </h2>
              <p className="mt-4 max-w-md font-serif text-lg italic leading-relaxed text-foreground/80">
                {t("final.lead")}
              </p>
              {offerOpen && (
                <p className="mt-4 max-w-md border-l-2 border-primary pl-3 text-sm font-semibold leading-relaxed">
                  {spotsLeft === null
                    ? t("final.offer", { months: EARLY_BIRD.months, spots: EARLY_BIRD.spots })
                    : t("final.offerLeft", { months: EARLY_BIRD.months, spots: EARLY_BIRD.spots, left: spotsLeft })}
                </p>
              )}
            </div>
            <WaitlistForm id="final" />
          </div>
        </section>

        <footer className="border-t border-border">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <p className="font-display text-xl font-extrabold uppercase">Ostinara</p>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {t("footer.tagline")}
              </p>
              <a
                href="mailto:contact@ostinara.app"
                className="mt-2 inline-block text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                contact@ostinara.app
              </a>
            </div>
            {footerLinks.map(({ title, links }) => (
              <div key={title}>
                <h4 className="mb-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {title}
                </h4>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mx-auto max-w-6xl border-t border-border px-5 py-6 text-xs text-muted-foreground">
            {t("footer.rights", { year })}
          </p>
        </footer>
      </div>
    </WaitlistProvider>
  );
}

/* Jouer · Atelier : le calendrier de pratique du Carnet. */
function CalendarFragment() {
  const t = useTranslations("landing.early.calendar");
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t("weeks")}
        </p>
        <p className="tabular font-display text-2xl font-extrabold leading-none">
          62 <span className="text-sm text-muted-foreground">{t("sessions")}</span>
        </p>
      </div>
      <div className="mt-3 grid grid-flow-col grid-rows-7 gap-[3px]">
        {calendar.map((level, i) => (
          <span key={i} className={`aspect-square rounded-[2px] ${calendarShade[level]}`} />
        ))}
      </div>
    </div>
  );
}

/* Biblio · Etagere : des morceaux en lignes a filets, tempo en frettes. */
function ShelfFragment() {
  const t = useTranslations("landing.early.shelf");
  return (
    <ul className="border-t border-border">
      {shelf.map((song) => (
        <li key={song.title} className="flex items-center gap-3 border-b border-border py-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-muted">
            <Icon name="music_note" className="h-4 w-4 text-muted-foreground" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{song.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {song.artist} · {t(song.status)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="tabular font-display text-base font-extrabold leading-none">{song.bpm}</span>
            <Frets value={song.value} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* Commu · Fanzine : un avis d'ami en serif, la note en condense. */
function ReviewFragment() {
  const t = useTranslations("landing.early.review");
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground font-display text-sm font-extrabold text-background">
          L
        </span>
        <p className="text-sm">
          <span className="font-bold">Lucie</span>{" "}
          <span className="text-muted-foreground">{t("rated")}</span>
        </p>
      </div>
      <div className="mt-4 flex items-end justify-between gap-4 border-b border-border pb-4">
        <p className="font-display text-3xl font-extrabold uppercase leading-[0.9]">
          Rumours
          <span className="block text-base text-muted-foreground">Fleetwood Mac</span>
        </p>
        <p className="tabular font-display text-5xl font-extrabold leading-none">
          9<span className="text-xl text-muted-foreground">/10</span>
        </p>
      </div>
      <p className="mt-4 font-serif italic leading-relaxed text-foreground/80">
        {t("quote")}
      </p>
      <p className="mt-3 flex gap-4 text-xs font-semibold text-muted-foreground">
        <span>🔥 12</span>
        <span>💬 4</span>
      </p>
    </div>
  );
}
