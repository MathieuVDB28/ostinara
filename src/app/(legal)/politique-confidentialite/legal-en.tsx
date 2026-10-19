import Link from "next/link";

const sections = [
  { id: "introduction", label: "Introduction" },
  { id: "responsable", label: "Data controller" },
  { id: "donnees", label: "Data collected" },
  { id: "finalites", label: "Purposes of processing" },
  { id: "base-legale", label: "Legal basis" },
  { id: "conservation", label: "Retention period" },
  { id: "partage", label: "Data sharing" },
  { id: "transferts", label: "International transfers" },
  { id: "cookies", label: "Cookies" },
  { id: "droits", label: "Your rights" },
  { id: "securite", label: "Security" },
  { id: "modifications", label: "Changes" },
  { id: "contact", label: "Contact" },
];

export function PolitiqueConfidentialiteEn() {
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
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Data protection
          </div>
          <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.92] sm:text-7xl">
            Privacy policy
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            We take the protection of your personal data very seriously. This policy explains how your data is collected, used and protected.
          </p>
          <p className="mt-3 text-sm text-muted-foreground/70">
            Last updated: October 19, 2026
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
          {/* 1. Introduction */}
          <section id="introduction" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                1
              </span>
              Introduction
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                This Privacy Policy applies to the Ostinara website and web app (the “Service”). It describes how your personal data is collected, processed and protected in accordance with the General Data Protection Regulation (GDPR - EU Regulation 2016/679) and the amended French Data Protection Act of January 6, 1978.
              </p>
              <p>
                By using the Service, you accept the practices described in this policy.
              </p>
            </div>
          </section>

          {/* 2. Responsable du traitement */}
          <section id="responsable" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                2
              </span>
              Data controller

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                The controller of personal data is:
              </p>
              <div className="rounded-xl border border-border bg-card/50 p-5">
                <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                  <div className="flex gap-3">
                    <span className="w-32 shrink-0 font-medium text-foreground">
                      Name

                    </span>
                    <span>Mathieu Vandenbussche</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex gap-3">
                    <span className="w-32 shrink-0 font-medium text-foreground">
                      Email
                    </span>
                    <span>contact@ostinara.app</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Données collectées */}
          <section id="donnees" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                3
              </span>
              Data collected

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>We collect the following categories of data:</p>
              <div className="space-y-4">
                {[
                  {
                    title: "Identification data",
                    items: [
                      "Username, email address",
                      "Profile picture (optional)",
                      "Links to social networks (optional)",
                      "Interface language (inferred on your first visit, editable in settings)",
                    ],
                  },
                  {
                    title: "Waitlist (early access)",
                    items: [
                      "Email address",
                      "The plan you are interested in (Free, Pro or Band)",
                      "Where the sign-up link came from (e.g. Instagram), if available",
                      "Sign-up date and position on the list",
                      "Language of the sign-up page, so we can write to you in that language",
                    ],
                  },
                  {
                    title: "Usage data",
                    items: [
                      "Songs added to the library and their progress",
                      "Practice sessions (duration, BPM, notes)",
                      "Published covers (video/audio files)",
                      "Social interactions (friends, feed, challenges)",
                      "Setlists created",
                    ],
                  },
                  {
                    title: "Technical data",
                    items: [
                      "IP address, browser type",
                      "Country inferred from the IP address and browser language, to pick the interface language (not stored; only the chosen language is)",
                      "Operating system, device type",
                      "Pages visited and actions taken",
                    ],
                  },
                  {
                    title: "Payment data",
                    items: [
                      "Processed directly by Stripe",
                      "We do not store any banking data",
                    ],
                  },
                ].map((category) => (
                  <div
                    key={category.title}
                    className="rounded-xl border border-border bg-card/50 p-5"
                  >
                    <h3 className="mb-3 text-sm font-semibold text-foreground">
                      {category.title}
                    </h3>
                    <ul className="space-y-2">
                      {category.items.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-3 text-sm"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 4. Finalités du traitement */}
          <section id="finalites" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                4
              </span>
              Purposes of processing

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Your personal data is processed for the following purposes:
              </p>
              <ul className="ml-1 space-y-2.5">
                {[
                  "Creating and managing your user account",
                  "Managing the waitlist: sign-up confirmation, sending your invitation and applying the launch offer",
                  "Providing and personalizing the service",
                  "Tracking your musical progress",
                  "Operating the social features (friends, feed, challenges)",
                  "Managing subscriptions and payments",
                  "Sending push notifications (with your consent)",
                  "Improving the service and analyzing usage",
                  "Communication about the service (updates, maintenance)",
                  "Complying with our legal obligations",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 5. Base légale */}
          <section id="base-legale" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                5
              </span>
              Legal basis for processing

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                The processing of your data is based on the following legal bases:
              </p>
              <div className="space-y-3">
                {[
                  {
                    base: "Performance of a contract",
                    desc: "Processing is necessary to provide the service you signed up for (account creation, progress tracking, social features).",
                  },
                  {
                    base: "Consent",
                    desc: "For signing up to the early access waitlist, sending push notifications and collecting non-essential cookies. You can withdraw your consent at any time.",
                  },
                  {
                    base: "Legitimate interest",
                    desc: "For improving the service, preventing fraud and securing the platform.",
                  },
                  {
                    base: "Legal obligation",
                    desc: "For complying with our tax and accounting obligations related to paid transactions.",
                  },
                ].map((item) => (
                  <div
                    key={item.base}
                    className="rounded-xl border border-border bg-card/50 p-4"
                  >
                    <div className="mb-1 text-sm font-semibold text-foreground">
                      {item.base}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 6. Durée de conservation */}
          <section id="conservation" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                6
              </span>
              Retention period

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Your personal data is kept for as long as necessary for the purposes for which it was collected:
              </p>
              <div className="rounded-xl border border-border bg-card/50 p-5">
                <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                  <div className="flex gap-3">
                    <span className="w-48 shrink-0 font-medium text-foreground">
                      Account data

                    </span>
                    <span>
                      Lifetime of the account + 30 days after deletion
                    </span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex gap-3">
                    <span className="w-48 shrink-0 font-medium text-foreground">
                      Waitlist
                    </span>
                    <span>
                      Until your access opens, then 6 months maximum if you don’t create an account. Deleted immediately if you unsubscribe
                    </span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex gap-3">
                    <span className="w-48 shrink-0 font-medium text-foreground">
                      Usage data
                    </span>
                    <span>Lifetime of the account</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex gap-3">
                    <span className="w-48 shrink-0 font-medium text-foreground">
                      Covers and media

                    </span>
                    <span>
                      Deleted within 30 days after the account is deleted
                    </span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex gap-3">
                    <span className="w-48 shrink-0 font-medium text-foreground">
                      Payment data

                    </span>
                    <span>
                      Kept by Stripe according to their own policy
                    </span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex gap-3">
                    <span className="w-48 shrink-0 font-medium text-foreground">
                      Technical logs

                    </span>
                    <span>12 months maximum</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 7. Partage des données */}
          <section id="partage" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                7
              </span>
              Data sharing

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Your personal data is never sold to third parties. It may be shared with the following providers, strictly for operating the service:
              </p>
              <div className="space-y-3">
                {[
                  {
                    name: "Supabase",
                    role: "Database hosting, authentication, file storage",
                  },
                  {
                    name: "Vercel",
                    role: "Web app hosting",
                  },
                  {
                    name: "Stripe",
                    role: "Payment processing",
                  },
                  {
                    name: "Resend",
                    role: "Sending transactional emails (waitlist sign-up confirmation, invitation)",
                  },
                  {
                    name: "Deezer",
                    role: "Music catalog: song and album search (through our servers, with no personal data), artwork and embedded player loaded from Deezer",
                  },
                ].map((provider) => (
                  <div
                    key={provider.name}
                    className="flex items-start gap-3 rounded-xl border border-border bg-card/50 p-4"
                  >
                    <span className="mt-0.5 text-sm font-semibold text-foreground">
                      {provider.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      — {provider.role}
                    </span>
                  </div>
                ))}
              </div>
              <p>
                Your data may also be disclosed upon a court order or where required by law.
              </p>
            </div>
          </section>

          {/* 8. Transferts internationaux */}
          <section id="transferts" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                8
              </span>
              International transfers

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Some of our providers (Supabase, Vercel, Stripe, Resend) are based in the United States. Data transfers to the United States are governed by the standard contractual clauses approved by the European Commission and/or the EU-US Data Privacy Framework.
              </p>
              <p>
                We make sure these providers offer sufficient safeguards for the protection of your data in accordance with the GDPR.
              </p>
            </div>
          </section>

          {/* 9. Cookies */}
          <section id="cookies" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                9
              </span>
              Cookies and similar technologies

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Ostinara uses cookies that are strictly necessary for the service to work:
              </p>
              <div className="space-y-3">
                {[
                  {
                    name: "Authentication cookies",
                    desc: "Keep you logged in. Essential for the service to work.",
                    essential: true,
                  },
                  {
                    name: "Preference cookies",
                    desc: "Remember your settings (theme, language). Essential to your experience.",
                    essential: true,
                  },
                  {
                    name: "Local storage (LocalStorage)",
                    desc: "Running the PWA and caching data for offline use.",
                    essential: true,
                  },
                ].map((cookie) => (
                  <div
                    key={cookie.name}
                    className="rounded-xl border border-border bg-card/50 p-4"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {cookie.name}
                      </span>
                      {cookie.essential && (
                        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em]">
                          Essential

                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {cookie.desc}
                    </div>
                  </div>
                ))}
              </div>
              <p>
                Ostinara currently uses no advertising or third-party tracking cookies.
              </p>
            </div>
          </section>

          {/* 10. Vos droits */}
          <section id="droits" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                10
              </span>
              Your rights

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Under the GDPR, you have the following rights regarding your personal data:
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    right: "Right of access",
                    desc: "Get confirmation that your data is being processed and receive a copy of it.",
                  },
                  {
                    right: "Right to rectification",
                    desc: "Correct inaccurate or incomplete data.",
                  },
                  {
                    right: "Right to erasure",
                    desc: "Request the deletion of your data under the conditions set by the GDPR.",
                  },
                  {
                    right: "Right to data portability",
                    desc: "Receive your data in a structured format and transfer it to another service.",
                  },
                  {
                    right: "Right to object",
                    desc: "Object to the processing of your data on legitimate grounds.",
                  },
                  {
                    right: "Right to restriction",
                    desc: "Request that the processing of your data be suspended in certain cases.",
                  },
                ].map((item) => (
                  <div
                    key={item.right}
                    className="rounded-xl border border-border bg-card/50 p-4"
                  >
                    <div className="mb-1 text-sm font-semibold text-foreground">
                      {item.right}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
              <p>
                To exercise these rights, contact us at{" "}
                <a
                  href="mailto:contact@ostinara.app"
                  className="font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
                >
                  contact@ostinara.app
                </a>
                . We will reply to your request within 30 days.
              </p>
              <p>
                If you are on the waitlist, every email we send you contains an unsubscribe link: it removes your address from the list immediately.
              </p>
              <p>
                You also have the right to lodge a complaint with the{" "}
                <span className="font-medium text-foreground">CNIL</span>{" "}
                (the French data protection authority) if you believe that the processing of your data does not comply with the regulations.
              </p>
            </div>
          </section>

          {/* 11. Sécurité */}
          <section id="securite" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                11
              </span>
              Data security

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, modification, disclosure or destruction:
              </p>
              <ul className="ml-1 space-y-2.5">
                {[
                  "Encryption of data in transit (HTTPS/TLS)",
                  "Encryption of data at rest through Supabase",
                  "Secure authentication with session management",
                  "Restricted data access following the principle of least privilege",
                  "Regular dependency updates and security patches",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 12. Modifications */}
          <section id="modifications" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                12
              </span>
              Changes to this policy

            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                We may update this privacy policy to reflect changes to our practices or for other operational, legal or regulatory reasons.
              </p>
              <p>
                In the event of a substantial change, we will inform you by an in-app notification or by email. The last updated date at the top of this page will also be updated.
              </p>
            </div>
          </section>

          {/* 13. Contact */}
          <section id="contact" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="tabular w-8 font-display text-2xl font-extrabold leading-none text-muted-foreground">
                13
              </span>
              Contact
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                For any question about the protection of your personal data or to exercise your rights, you can contact us:
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
              <p>
                We undertake to reply to any request within a reasonable time and no later than 30 days after receiving it.
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
          </div>
        </div>
      </div>
    </div>
  );
}
