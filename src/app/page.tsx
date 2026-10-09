import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/ui/icon";
import { Frets } from "@/components/ui/frets";

/*
 * Les trois onglets de l'app, dans leurs mots (cf. src/lib/navigation.ts).
 * Pas de numerotation : ce ne sont pas des etapes.
 */
const features = [
  {
    tab: "Jouer",
    icon: "metronome",
    title: "Un carnet de pratique",
    description:
      "Métronome, accordeur, exercices et chrono de session. Ton tempo tenu est mesuré séance après séance, pas estimé au doigt mouillé.",
  },
  {
    tab: "Biblio",
    icon: "library_music",
    title: "Tes morceaux en étagères",
    description:
      "Ce que tu travailles, ce que tu veux apprendre, ce que tu maîtrises. Accordage, capo, tablature et tempo cible au même endroit.",
  },
  {
    tab: "Commu",
    icon: "videocam",
    title: "Tes covers, tes amis",
    description:
      "Publie tes covers, note les albums que tu écoutes, lance des défis de pratique à tes amis musiciens.",
  },
];

const footerLinks = {
  Produit: [{ label: "Fonctionnalités", href: "#features" }],
  Légal: [
    { label: "Mentions légales", href: "/mentions-legales" },
    { label: "CGU", href: "/cgu" },
    { label: "Confidentialité", href: "/politique-confidentialite" },
  ],
};

/**
 * La page d'accueil publique, dans les styles de l'app (docs/refonte-ui.md) :
 * titres en capitales condensees (Fanzine), chiffres et filets (Atelier).
 * Plus de halos flottants ni de cartes « verre ».
 */
export default function Home() {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="" width={32} height={32} className="rounded-md" />
            <span className="font-display text-2xl font-extrabold uppercase leading-none tracking-[0.02em]">
              Ostinara
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Commencer
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-end gap-10 px-5 pb-16 pt-14 sm:pt-20 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:pb-24">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            L&apos;app des guitaristes · Stay tuned
          </p>
          <h1 className="mt-4 font-display text-[clamp(64px,13vw,148px)] font-extrabold uppercase leading-[0.84] tracking-[-0.005em]">
            Joue.
            <br />
            Mesure.
            <br />
            <span className="text-primary">Partage.</span>
          </h1>
          <p className="mt-6 max-w-xl font-serif text-lg italic leading-relaxed text-foreground/80 sm:text-xl">
            Suis tes morceaux, mesure ta progression au tempo et partage tes
            covers avec tes amis. Tout ce dont un guitariste a besoin, au même
            endroit.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-primary px-7 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Créer mon compte
              <Icon name="arrow_forward" className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="#features"
              className="inline-flex min-h-[52px] items-center justify-center rounded-xl border border-border px-7 text-base font-semibold transition-colors hover:bg-accent"
            >
              Découvrir
            </Link>
          </div>
        </div>

        {/*
          Un fragment de l'app plutot qu'une illustration : le tempo tenu
          sur un morceau, en frettes, comme dans le Carnet.
        */}
        <figure aria-hidden="true" className="border-y border-border py-6 lg:mb-3">
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Tempo tenu · cette semaine
          </p>
          <p className="tabular mt-2 font-display text-[112px] font-extrabold leading-[0.85]">
            92<span className="text-4xl text-muted-foreground">/104</span>
          </p>
          <div className="mt-4 flex items-center justify-between gap-4">
            <span className="font-display text-sm font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Bpm
            </span>
            <Frets value={73} className="scale-150 origin-right" />
          </div>
        </figure>
      </section>

      {/* Ce que fait l'app */}
      <section id="features" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <h2 className="max-w-3xl font-display text-5xl font-extrabold uppercase leading-[0.9] sm:text-6xl">
            Tout pour progresser, <span className="text-primary">rien de superflu</span>
          </h2>

          <div className="mt-12 grid gap-px overflow-hidden border-y border-border bg-border sm:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.tab} className="bg-background py-8 sm:px-6 sm:first:pl-0">
                <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  <Icon name={feature.icon} className="h-4 w-4" />
                  {feature.tab}
                </p>
                <h3 className="mt-3 font-display text-3xl font-extrabold uppercase leading-[0.95]">
                  {feature.title}
                </h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Appel final */}
      <section className="border-t border-border bg-secondary">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-16 sm:py-20 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="font-display text-5xl font-extrabold uppercase leading-[0.9] sm:text-7xl">
            Prêt à tracker
            <br />
            ta <span className="text-primary">progression</span> ?
          </h2>
          <div className="flex flex-col items-start gap-2">
            <Link
              href="/register"
              className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-primary px-7 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Commencer gratuitement
              <Icon name="arrow_forward" className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <p className="text-sm text-muted-foreground">Gratuit jusqu&apos;à 10 morceaux. Sans carte bancaire.</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <p className="font-display text-xl font-extrabold uppercase">Ostinara</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              L&apos;application tout-en-un pour les guitaristes qui veulent progresser et partager.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">contact@ostinara.app</p>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
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
          &copy; {year} Ostinara. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}
