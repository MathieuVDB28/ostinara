import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mentions légales - Ostinara",
  description:
    "Mentions légales du site Ostinara. Informations sur l'éditeur, l'hébergeur et les conditions d'utilisation.",
};

const sections = [
  { id: "editeur", label: "Éditeur du site" },
  { id: "publication", label: "Directeur de la publication" },
  { id: "hebergeur", label: "Hébergeur" },
  { id: "propriete", label: "Propriété intellectuelle" },
  { id: "responsabilite", label: "Limitation de responsabilité" },
  { id: "liens", label: "Liens hypertextes" },
  { id: "droit", label: "Droit applicable" },
  { id: "contact", label: "Contact" },
];

export default function MentionsLegales() {
  return (
    <div className="relative">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border py-20">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-pulse-glow absolute -top-1/2 left-1/3 h-[600px] w-[600px] rounded-full bg-primary/15 blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-4xl px-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <svg
              className="h-3.5 w-3.5 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points="14 2 14 8 20 8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Document légal
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Mentions légales
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Conformément aux dispositions de la loi n° 2004-575 du 21 juin 2004
            pour la confiance dans l&apos;économie numérique (LCEN).
          </p>
          <p className="mt-3 text-sm text-muted-foreground/70">
            Dernière mise à jour : 5 février 2026
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Table of contents */}
        <div className="mb-12 rounded-2xl border border-border bg-card/50 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Sommaire
          </h2>
          <nav className="grid gap-1.5 sm:grid-cols-2">
            {sections.map((section, i) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  {i + 1}
                </span>
                {section.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="space-y-12">
          {/* 1. Éditeur */}
          <section id="editeur" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                1
              </span>
              Éditeur du site
            </h2>
            <div className="rounded-xl border border-border bg-card/50 p-5">
              <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                <div className="flex gap-3">
                  <span className="w-40 shrink-0 font-medium text-foreground">
                    Nom du site
                  </span>
                  <span>Ostinara</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex gap-3">
                  <span className="w-40 shrink-0 font-medium text-foreground">
                    URL
                  </span>
                  <span>https://ostinara.app</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex gap-3">
                  <span className="w-40 shrink-0 font-medium text-foreground">
                    Éditeur
                  </span>
                  <span>Mathieu Vandenbussche (personne physique)</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex gap-3">
                  <span className="w-40 shrink-0 font-medium text-foreground">
                    Email
                  </span>
                  <span>contact@ostinara.app</span>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Directeur de la publication */}
          <section id="publication" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                2
              </span>
              Directeur de la publication
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Le directeur de la publication est{" "}
                <span className="font-medium text-foreground">
                  Mathieu Vandenbussche
                </span>
                , en sa qualité d&apos;éditeur du site.
              </p>
            </div>
          </section>

          {/* 3. Hébergeur */}
          <section id="hebergeur" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                3
              </span>
              Hébergeur
            </h2>
            <div className="rounded-xl border border-border bg-card/50 p-5">
              <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                <div className="flex gap-3">
                  <span className="w-40 shrink-0 font-medium text-foreground">
                    Raison sociale
                  </span>
                  <span>Vercel Inc.</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex gap-3">
                  <span className="w-40 shrink-0 font-medium text-foreground">
                    Adresse
                  </span>
                  <span>440 N Barranca Ave #4133, Covina, CA 91723, USA</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex gap-3">
                  <span className="w-40 shrink-0 font-medium text-foreground">
                    Site web
                  </span>
                  <span>https://vercel.com</span>
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Les données des utilisateurs sont stockées par{" "}
              <span className="font-medium text-foreground">
                Supabase Inc.
              </span>{" "}
              (base de données, authentification et stockage de fichiers),
              société basée à San Francisco, CA, USA.
            </p>
          </section>

          {/* 4. Propriété intellectuelle */}
          <section id="propriete" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                4
              </span>
              Propriété intellectuelle
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                L&apos;ensemble du contenu du site Ostinara (textes, graphismes,
                images, logos, icônes, sons, logiciels, code source, base de
                données) est protégé par les lois françaises et internationales
                relatives à la propriété intellectuelle.
              </p>
              <p>
                Toute reproduction, représentation, modification, publication,
                distribution, ou exploitation totale ou partielle des éléments
                du site est strictement interdite sans l&apos;autorisation
                écrite préalable de l&apos;éditeur.
              </p>
              <p>
                Le nom « Ostinara », le logo et le slogan « Stay tuned » sont
                des marques déposées ou non de l&apos;éditeur. Toute
                utilisation non autorisée constitue une contrefaçon passible de
                sanctions pénales.
              </p>
            </div>
          </section>

          {/* 5. Limitation de responsabilité */}
          <section id="responsabilite" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                5
              </span>
              Limitation de responsabilité
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                L&apos;éditeur s&apos;efforce d&apos;assurer l&apos;exactitude
                et la mise à jour des informations diffusées sur le site, mais
                ne peut garantir l&apos;exactitude, la précision ou
                l&apos;exhaustivité des informations mises à disposition.
              </p>
              <p>
                L&apos;éditeur ne pourra être tenu responsable des dommages
                directs ou indirects résultant de l&apos;accès au site ou de
                l&apos;utilisation de celui-ci, y compris l&apos;inaccessibilité,
                les pertes de données, les détériorations, les destructions ou
                les virus qui pourraient affecter l&apos;équipement informatique
                de l&apos;utilisateur.
              </p>
              <p>
                Le site Ostinara peut être interrompu à tout moment par
                l&apos;éditeur pour des besoins de maintenance, de mise à jour
                ou pour toute autre raison, sans que cela ne donne lieu à une
                quelconque obligation ou indemnisation.
              </p>
            </div>
          </section>

          {/* 6. Liens hypertextes */}
          <section id="liens" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                6
              </span>
              Liens hypertextes
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Le site Ostinara peut contenir des liens vers d&apos;autres
                sites internet (notamment Spotify, Ultimate Guitar). Ces liens
                sont fournis à titre indicatif et ne signifient pas que
                l&apos;éditeur approuve ou cautionne le contenu de ces sites
                tiers.
              </p>
              <p>
                L&apos;éditeur n&apos;exerce aucun contrôle sur ces sites et
                décline toute responsabilité quant à leur contenu, leur
                disponibilité ou leurs pratiques en matière de protection des
                données personnelles.
              </p>
            </div>
          </section>

          {/* 7. Droit applicable */}
          <section id="droit" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                7
              </span>
              Droit applicable
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Les présentes mentions légales sont régies par le droit
                français. En cas de litige, et après tentative de résolution
                amiable, les tribunaux français seront seuls compétents.
              </p>
            </div>
          </section>

          {/* 8. Contact */}
          <section id="contact" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                8
              </span>
              Contact
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Pour toute question relative aux présentes mentions légales ou
                au fonctionnement du site, vous pouvez nous contacter à
                l&apos;adresse suivante :
              </p>
              <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/50 px-4 py-2.5 text-sm">
                <svg
                  className="h-4 w-4 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <a
                  href="mailto:contact@ostinara.app"
                  className="font-medium text-foreground transition-colors hover:text-primary"
                >
                  contact@ostinara.app
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* Cross-links */}
        <div className="mt-16 rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-8">
          <h3 className="mb-4 text-lg font-semibold">Voir aussi</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/cgu"
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <svg
                  className="h-5 w-5 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div>
                <div className="font-medium transition-colors group-hover:text-primary">
                  Conditions Générales d&apos;Utilisation
                </div>
                <div className="text-xs text-muted-foreground">
                  Règles d&apos;utilisation du service
                </div>
              </div>
            </Link>
            <Link
              href="/politique-confidentialite"
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <svg
                  className="h-5 w-5 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div>
                <div className="font-medium transition-colors group-hover:text-primary">
                  Politique de confidentialité
                </div>
                <div className="text-xs text-muted-foreground">
                  Protection de vos données personnelles
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
