import Link from "next/link";

const sections = [
  { id: "objet", label: "Purpose" },
  { id: "acceptation", label: "Acceptance of the terms" },
  { id: "description", label: "Description of the service" },
  { id: "inscription", label: "Registration and account" },
  { id: "offres", label: "Plans and pricing" },
  { id: "contenu", label: "User content" },
  { id: "propriete", label: "Intellectual property" },
  { id: "obligations", label: "User obligations" },
  { id: "responsabilite", label: "Liability" },
  { id: "donnees", label: "Personal data" },
  { id: "modification", label: "Changes to the terms" },
  { id: "resiliation", label: "Termination" },
  { id: "droit", label: "Governing law" },
];

export function CguEn() {
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
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Legal document
          </div>
          <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.92] sm:text-7xl">
            Terms of Use
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            These Terms of Use set out the rules for using the Ostinara service and the rights and obligations of its users.
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
          {/* 1. Objet */}
          <section id="objet" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                1
              </span>
              Purpose

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                The purpose of these Terms of Use (the “Terms”) is to define the conditions under which users may access and use the Ostinara service, a progressive web app (PWA) for musicians.
              </p>
              <p>
                Among other things, the service lets you manage a library of songs, track your progress, record and share covers, and interact with other musicians.
              </p>
            </div>
          </section>

          {/* 2. Acceptation */}
          <section id="acceptation" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                2
              </span>
              Acceptance of the terms

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Using the Ostinara service implies full acceptance of these Terms. Signing up for the service constitutes unreserved acceptance of all the provisions below.
              </p>
              <p>
                If you do not accept these terms, you must not use the service.
              </p>
            </div>
          </section>

          {/* 3. Description du service */}
          <section id="description" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                3
              </span>
              Description of the service

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>Ostinara offers the following features:</p>
              <ul className="ml-1 space-y-2.5">
                {[
                  "Personal song library with progress tracking",
                  "Practice log with history and statistics",
                  "Recording and sharing covers (video and audio)",
                  "Built-in metronome for practice sessions",
                  "Setlist creation",
                  "Social features: friends, activity feed, challenges",
                  "Third-party integrations (Deezer music catalog, tab search)",
                  "Collaborative Jam Session mode",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <p>
                The publisher reserves the right to modify, suspend or remove all or part of the service’s features at any time, without notice.
              </p>
            </div>
          </section>

          {/* 4. Inscription et compte */}
          <section id="inscription" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                4
              </span>
              Registration and user account

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Access to the service requires creating a user account. Users agree to provide accurate and up-to-date information when signing up.
              </p>
              <p>
                Users are responsible for keeping their login credentials confidential and for all activity carried out from their account. In the event of unauthorized use of their account, users must notify the publisher immediately.
              </p>
              <p>
                The publisher reserves the right to suspend or delete any account that breaches these Terms, without notice or compensation.
              </p>
            </div>
          </section>

          {/* 5. Offres et tarification */}
          <section id="offres" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                5
              </span>
              Plans and pricing

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Ostinara offers several subscription tiers:
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    name: "Free",
                    desc: "Limited access (10 songs, 3 covers, 5 friends, 2 instruments)",
                  },
                  {
                    name: "Pro",
                    desc: "Unlimited access, advanced statistics",
                  },
                  {
                    name: "Band",
                    desc: "Pro features + band spaces",
                  },
                ].map((plan) => (
                  <div
                    key={plan.name}
                    className="rounded-xl border border-border bg-card/50 p-4"
                  >
                    <div className="mb-1 text-sm font-semibold text-foreground">
                      {plan.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {plan.desc}
                    </div>
                  </div>
                ))}
              </div>
              <p>
                Payments are processed securely by{" "}
                <span className="font-medium text-foreground">Stripe</span>.
                The publisher does not store any banking data.
              </p>
              <p>
                Paid subscriptions renew automatically unless cancelled by the user before the end of the current period. Users can manage their subscription from the “My subscription” page of their account.
              </p>
            </div>
          </section>

          {/* 6. Contenu utilisateur */}
          <section id="contenu" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                6
              </span>
              User content

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Users are solely responsible for the content they publish on Ostinara (covers, notes, comments, etc.). They warrant that they hold all the rights needed to publish this content.
              </p>
              <p>
                Users grant Ostinara a non-exclusive, worldwide, royalty-free license to host, display and distribute their content as part of operating the service.
              </p>
              <p>It is strictly forbidden to publish content that is:</p>
              <ul className="ml-1 space-y-2.5">
                {[
                  "Illegal, defamatory, abusive or discriminatory",
                  "Infringing the intellectual property rights of third parties",
                  "Containing third parties' personal data without their consent",
                  "Unauthorized advertising or commercial content",
                  "Containing viruses or any other malicious program",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                    {item}
                  </li>
                ))}
              </ul>
              <p>
                The publisher reserves the right to remove any content that breaches these Terms, without notice or compensation.
              </p>
            </div>
          </section>

          {/* 7. Propriété intellectuelle */}
          <section id="propriete" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                7
              </span>
              Intellectual property

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                The Ostinara service, its source code, design, features and all of its editorial content are the exclusive property of the publisher and are protected by intellectual property law.
              </p>
              <p>
                Users acquire no intellectual property rights in the service or its components. They only have a personal, non-transferable right of use within the normal use of the service.
              </p>
            </div>
          </section>

          {/* 8. Obligations de l'utilisateur */}
          <section id="obligations" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                8
              </span>
              User obligations

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>Users agree to:</p>
              <ul className="ml-1 space-y-2.5">
                {[
                  "Use the service for its intended purpose and in accordance with these Terms",
                  "Not attempt to circumvent the service's security measures",
                  "Not use automated systems (bots, scripts) to access the service",
                  "Respect the rights of other users and intellectual property rights",
                  "Not impersonate another user",
                  "Report any inappropriate content or behavior",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 9. Responsabilité */}
          <section id="responsabilite" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                9
              </span>
              Liability

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                The publisher uses reasonable means to ensure the availability and proper functioning of the service, without guaranteeing uninterrupted or error-free access.
              </p>
              <p>
                The service is provided “as is”. The publisher cannot be held liable for any direct or indirect damage resulting from the use of, or inability to use, the service, including data loss or any financial loss.
              </p>
              <p>
                The publisher is not responsible for content published by users or for exchanges between users within the service’s social features (feed, challenges, jam sessions).
              </p>
            </div>
          </section>

          {/* 10. Données personnelles */}
          <section id="donnees" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                10
              </span>
              Personal data

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Users’ personal data is processed in accordance with the General Data Protection Regulation (GDPR) and the French Data Protection Act (loi Informatique et Libertés).
              </p>
              <p>
                For more information on how your personal data is collected, processed and protected, please see our{" "}
                <Link
                  href="/politique-confidentialite"
                  className="font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
                >
                  Privacy policy
                </Link>
                .
              </p>
            </div>
          </section>

          {/* 11. Modification des CGU */}
          <section id="modification" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                11
              </span>
              Changes to the terms

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                The publisher reserves the right to modify these Terms at any time. Users will be informed of any substantial change by an in-app notification or by email.
              </p>
              <p>
                Continuing to use the service after the Terms have been modified constitutes acceptance of the new terms. If users do not accept the changes, they must stop using the service and delete their account.
              </p>
            </div>
          </section>

          {/* 12. Résiliation */}
          <section id="resiliation" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                12
              </span>
              Termination

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Users can close their account at any time from their profile settings. Closing the account deletes it along with all of its data, in accordance with our data retention policy.
              </p>
              <p>
                In the event of a breach of these Terms, the publisher may suspend or delete the user’s account immediately, without notice or compensation, and without prejudice to any damages the publisher may claim.
              </p>
            </div>
          </section>

          {/* 13. Droit applicable */}
          <section id="droit" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                13
              </span>
              Governing law and disputes

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                These Terms are governed by French law. In the event of a dispute about the interpretation or performance of these terms, the parties agree to seek an amicable solution before taking any legal action.
              </p>
              <p>
                In accordance with the French Consumer Code’s provisions on amicable dispute resolution, users may use the mediation service offered by the publisher free of charge. Failing an amicable resolution, the dispute will be brought before the competent courts.
              </p>
            </div>
          </section>
        </div>

        {/* Cross-links */}
        <div className="mt-16 border-t border-border pt-8">
          <h3 className="mb-4 text-lg font-semibold">See also</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/mentions-legales"
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
                </svg>
              </div>
              <div>
                <div className="font-medium transition-colors group-hover:text-primary">
                  Legal notice

                </div>
                <div className="text-xs text-muted-foreground">
                  Mandatory legal information
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
