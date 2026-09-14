import Link from "next/link";
import Image from "next/image";

const features = [
  {
    icon: "library_music",
    title: "Bibliothèque personnelle",
    description:
      "Organise tous tes morceaux, ajoute des notes, le tuning, le capo. Tout est centralisé au même endroit.",
  },
  {
    icon: "trending_up",
    title: "Suivi de progression",
    description:
      "Visualise ta courbe d'apprentissage avec des graphiques détaillés. Suis ton évolution sur chaque morceau.",
  },
  {
    icon: "videocam",
    title: "Partage tes covers",
    description:
      "Enregistre et partage tes covers vidéo ou audio avec tes amis musiciens. Montre tes progrès.",
  },
];

const stats = [
  { value: "1K+", label: "Guitaristes actifs" },
  { value: "10K+", label: "Morceaux trackés" },
  { value: "5K+", label: "Covers partagés" },
  { value: "99%", label: "Satisfaction" },
];

const footerLinks = {
  Produit: [
    { label: "Fonctionnalités", href: "#features" },
    { label: "Tarifs", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ],
  Légal: [
    { label: "Mentions légales", href: "/mentions-legales" },
    { label: "CGU", href: "/cgu" },
    { label: "Confidentialité", href: "/politique-confidentialite" },
  ],
  Contact: [
    { label: "contact@ostinara.app", href: "mailto:contact@ostinara.app" },
  ],
};

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* ──────────────── Global decorative blobs ──────────────── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="animate-pulse-glow absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="animate-float absolute top-[60%] -right-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="animate-float absolute bottom-0 -left-40 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      {/* ──────────────── Navbar ──────────────── */}
      <nav className="fixed top-0 right-0 left-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center">
              <Image
                src="/logo.png"
                alt="Ostinara"
                width={36}
                height={36}
                className="rounded-lg"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold leading-tight text-primary">
                Ostinara
              </span>
              <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                Stay tuned
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 hover:shadow-[0_0_20px_rgba(55,19,236,0.4)]"
            >
              Commencer
            </Link>
          </div>
        </div>
      </nav>

      {/* ──────────────── Hero Section ──────────────── */}
      <section className="relative flex min-h-screen items-center justify-center pt-16">
        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="flex flex-col items-center text-center">
            {/* Badge */}
            <div className="animate-fade-in-up mb-8 inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-5 py-2 text-sm backdrop-blur-sm">
              <span className="material-symbols-outlined text-[18px] text-primary">
                auto_awesome
              </span>
              <span className="text-muted-foreground">
                L&apos;app des guitaristes passionnés
              </span>
            </div>

            {/* Headline */}
            <h1 className="animate-fade-in-up max-w-5xl text-5xl leading-[1.08] font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
              Track Your{" "}
              <span className="text-primary">
                Guitar Journey
              </span>
            </h1>

            {/* Subtitle */}
            <p className="animate-fade-in-up mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl md:text-2xl [animation-delay:100ms]">
              Track tes morceaux, mesure ta progression et partage tes covers
              avec ta communauté. Tout ce dont un guitariste a besoin.
            </p>

            {/* CTA Buttons */}
            <div className="animate-fade-in-up mt-10 flex flex-col gap-4 sm:flex-row [animation-delay:200ms]">
              <Link
                href="/register"
                className="group relative inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-lg font-semibold text-primary-foreground transition-all hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(55,19,236,0.4)]"
              >
                <span>Créer mon compte</span>
                <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-card/50 px-8 py-3.5 text-lg font-semibold backdrop-blur-sm transition-all hover:bg-accent"
              >
                Découvrir
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground/50">Scroll</span>
          <div className="h-8 w-[1px] animate-pulse bg-gradient-to-b from-muted-foreground/40 to-transparent" />
        </div>
      </section>

      {/* ──────────────── Stats Section ──────────────── */}
      <section className="relative py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border/50 bg-card/50 p-6 text-center backdrop-blur-xl transition-all hover:border-primary/30"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="text-3xl font-extrabold text-primary sm:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── Features Section ──────────────── */}
      <section id="features" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          {/* Section header */}
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl md:text-5xl">
              Tout pour progresser,{" "}
              <span className="text-primary">
                rien de superflu
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Des outils pensés par des guitaristes, pour des guitaristes.
              Simple, efficace, motivant.
            </p>
          </div>

          {/* Feature cards - glass style */}
          <div className="grid gap-6 sm:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-8 backdrop-blur-xl transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_40px_rgba(55,19,236,0.1)]"
              >
                {/* Hover gradient overlay */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="relative">
                  {/* Icon */}
                  <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <span className="material-symbols-outlined text-[28px] text-primary">
                      {feature.icon}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="mb-3 text-xl font-semibold">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>

                {/* Decorative number */}
                <div className="pointer-events-none absolute -top-4 -right-4 text-8xl font-bold text-border/20 select-none">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── Social Proof / Quote Section ──────────────── */}
      <section className="relative py-24">
        {/* Blob */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute bottom-0 left-1/4 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <div className="mb-8 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <span className="material-symbols-outlined text-[32px] text-primary">
              format_quote
            </span>
          </div>
          <blockquote className="text-2xl leading-relaxed font-medium sm:text-3xl">
            &ldquo;Depuis que j&apos;utilise Ostinara, je vois enfin ma
            progression. Ça me motive à pratiquer tous les jours.&rdquo;
          </blockquote>
          <div className="mt-6">
            <div className="font-semibold">Lucas M.</div>
            <div className="text-sm text-muted-foreground">
              Guitariste depuis 3 ans
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────── Final CTA Section ──────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/50 p-12 backdrop-blur-xl sm:p-16">
            {/* Decorative blobs */}
            <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/20 blur-[80px]" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-primary/20 blur-[80px]" />

            <div className="relative text-center">
              <h2 className="text-3xl font-bold sm:text-4xl md:text-5xl">
                Prêt à tracker ta{" "}
                <span className="text-primary">
                  progression
                </span>{" "}
                ?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
                Rejoins des milliers de guitaristes qui utilisent Ostinara pour
                progresser chaque jour.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/register"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-lg font-semibold text-primary-foreground transition-all hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(55,19,236,0.4)]"
                >
                  Commencer gratuitement
                  <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </Link>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Gratuit jusqu&apos;à 10 morceaux. Sans carte bancaire.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────── Footer ──────────────── */}
      <footer className="border-t border-border/50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center">
                  <Image
                    src="/logo.png"
                    alt="Ostinara"
                    width={36}
                    height={36}
                    className="rounded-lg"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold leading-tight text-primary">
                    Ostinara
                  </span>
                  <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                    Stay tuned
                  </span>
                </div>
              </div>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                L&apos;application tout-en-un pour les guitaristes qui veulent
                progresser et partager.
              </p>
            </div>

            {/* Link columns */}
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {title}
                </h4>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-8 sm:flex-row">
            <div className="text-sm text-muted-foreground">
              &copy; 2025 Ostinara. Tous droits réservés.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
