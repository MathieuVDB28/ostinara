import Link from "next/link";

const sections = [
  { id: "editeur", label: "Site publisher" },
  { id: "publication", label: "Publication director" },
  { id: "hebergeur", label: "Hosting provider" },
  { id: "propriete", label: "Intellectual property" },
  { id: "responsabilite", label: "Limitation of liability" },
  { id: "liens", label: "Hyperlinks" },
  { id: "droit", label: "Governing law" },
  { id: "contact", label: "Contact" },
];

export function MentionsLegalesEn() {
  return (
    <div className="relative">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border py-20">
        <div className="relative mx-auto max-w-4xl px-6">
          <div className="mb-4 inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
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
            Legal document
          </div>
          <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.92] sm:text-7xl">
            Legal notice
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            In accordance with French law no. 2004-575 of June 21, 2004 on confidence in the digital economy (LCEN).
          </p>
          <p className="mt-3 text-sm text-muted-foreground/70">
            Last updated: February 5, 2026
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
            Contents
          </h2>
          <nav className="grid gap-1.5 sm:grid-cols-2">
            {sections.map((section, i) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
              >
                <span className="tabular w-6 shrink-0 font-display text-base font-extrabold text-muted-foreground transition-colors group-hover:text-foreground">
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
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                1
              </span>
              Site publisher

            </h2>
            <div className="rounded-xl border border-border bg-card/50 p-5">
              <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                <div className="flex gap-3">
                  <span className="w-40 shrink-0 font-medium text-foreground">
                    Site name

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
                    Publisher

                  </span>
                  <span>Mathieu Vandenbussche (private individual)</span>
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
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                2
              </span>
              Publication director

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                The publication director is{" "}
                <span className="font-medium text-foreground">
                  Mathieu Vandenbussche
                </span>
                , in his capacity as publisher of the site.
              </p>
            </div>
          </section>

          {/* 3. Hébergeur */}
          <section id="hebergeur" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                3
              </span>
              Hosting provider

            </h2>
            <div className="rounded-xl border border-border bg-card/50 p-5">
              <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                <div className="flex gap-3">
                  <span className="w-40 shrink-0 font-medium text-foreground">
                    Company name

                  </span>
                  <span>Vercel Inc.</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex gap-3">
                  <span className="w-40 shrink-0 font-medium text-foreground">
                    Address

                  </span>
                  <span>440 N Barranca Ave #4133, Covina, CA 91723, USA</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex gap-3">
                  <span className="w-40 shrink-0 font-medium text-foreground">
                    Website

                  </span>
                  <span>https://vercel.com</span>
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              User data is stored by{" "}
              <span className="font-medium text-foreground">
                Supabase Inc.
              </span>{" "}
              (database, authentication and file storage), a company based in San Francisco, CA, USA.
            </p>
          </section>

          {/* 4. Propriété intellectuelle */}
          <section id="propriete" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                4
              </span>
              Intellectual property

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                All content on the Ostinara site (texts, graphics, images, logos, icons, sounds, software, source code, database) is protected by French and international intellectual property laws.
              </p>
              <p>
                Any reproduction, representation, modification, publication, distribution or exploitation, in whole or in part, of the site’s elements is strictly prohibited without the publisher’s prior written consent.
              </p>
              <p>
                The name “Ostinara”, the logo and the slogan “Stay tuned” are registered or unregistered trademarks of the publisher. Any unauthorized use constitutes infringement punishable by criminal penalties.
              </p>
            </div>
          </section>

          {/* 5. Limitation de responsabilité */}
          <section id="responsabilite" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                5
              </span>
              Limitation of liability

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                The publisher strives to ensure that the information published on the site is accurate and up to date, but cannot guarantee the accuracy, precision or completeness of the information made available.
              </p>
              <p>
                The publisher cannot be held liable for any direct or indirect damage resulting from access to or use of the site, including unavailability, data loss, damage, destruction or viruses that may affect the user’s computer equipment.
              </p>
              <p>
                The Ostinara site may be interrupted at any time by the publisher for maintenance, updates or any other reason, without giving rise to any obligation or compensation.
              </p>
            </div>
          </section>

          {/* 6. Liens hypertextes */}
          <section id="liens" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                6
              </span>
              Hyperlinks

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                The Ostinara site may contain links to other websites (including Deezer and Ultimate Guitar). These links are provided for information only and do not mean that the publisher approves or endorses the content of these third-party sites.
              </p>
              <p>
                The publisher has no control over these sites and accepts no responsibility for their content, availability or personal data practices.
              </p>
            </div>
          </section>

          {/* 7. Droit applicable */}
          <section id="droit" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                7
              </span>
              Governing law

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                This legal notice is governed by French law. In the event of a dispute, and after an attempt at amicable resolution, the French courts shall have sole jurisdiction.
              </p>
            </div>
          </section>

          {/* 8. Contact */}
          <section id="contact" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                8
              </span>
              Contact
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                For any question about this legal notice or how the site works, you can contact us at the following address:
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
        <div className="mt-16 border-t border-border pt-8">
          <h3 className="mb-4 text-lg font-semibold">See also</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/cgu"
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center text-muted-foreground">
                <svg
                  className="h-5 w-5"
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
                  Terms of Use
                </div>
                <div className="text-xs text-muted-foreground">
                  Rules for using the service
                </div>
              </div>
            </Link>
            <Link
              href="/politique-confidentialite"
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center text-muted-foreground">
                <svg
                  className="h-5 w-5"
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
                  Privacy policy
                </div>
                <div className="text-xs text-muted-foreground">
                  Protecting your personal data
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
