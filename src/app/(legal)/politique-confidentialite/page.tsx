import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité - Ostinara",
  description:
    "Politique de confidentialité d'Ostinara. Informations sur la collecte, le traitement et la protection de vos données personnelles.",
};

const sections = [
  { id: "introduction", label: "Introduction" },
  { id: "responsable", label: "Responsable du traitement" },
  { id: "donnees", label: "Données collectées" },
  { id: "finalites", label: "Finalités du traitement" },
  { id: "base-legale", label: "Base légale" },
  { id: "conservation", label: "Durée de conservation" },
  { id: "partage", label: "Partage des données" },
  { id: "transferts", label: "Transferts internationaux" },
  { id: "cookies", label: "Cookies" },
  { id: "droits", label: "Vos droits" },
  { id: "securite", label: "Sécurité" },
  { id: "modifications", label: "Modifications" },
  { id: "contact", label: "Contact" },
];

export default function PolitiqueConfidentialite() {
  return (
    <div className="relative">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border py-20">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-pulse-glow absolute -top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
          <div className="absolute top-1/4 right-0 h-[300px] w-[300px] rounded-full bg-chart-5/10 blur-[100px]" />
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
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Protection des données
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Politique de confidentialité
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Nous attachons une grande importance à la protection de vos données
            personnelles. Cette politique vous informe sur la manière dont vos
            données sont collectées, utilisées et protégées.
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
          {/* 1. Introduction */}
          <section id="introduction" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                1
              </span>
              Introduction
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                La présente Politique de confidentialité s&apos;applique au site
                et à l&apos;application web Ostinara (ci-après « le Service »).
                Elle décrit la manière dont vos données personnelles sont
                collectées, traitées et protégées conformément au Règlement
                Général sur la Protection des Données (RGPD - Règlement UE
                2016/679) et à la loi Informatique et Libertés du 6 janvier
                1978 modifiée.
              </p>
              <p>
                En utilisant le Service, vous acceptez les pratiques décrites
                dans la présente politique.
              </p>
            </div>
          </section>

          {/* 2. Responsable du traitement */}
          <section id="responsable" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                2
              </span>
              Responsable du traitement
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Le responsable du traitement des données personnelles est :
              </p>
              <div className="rounded-xl border border-border bg-card/50 p-5">
                <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                  <div className="flex gap-3">
                    <span className="w-32 shrink-0 font-medium text-foreground">
                      Nom
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
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                3
              </span>
              Données collectées
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>Nous collectons les catégories de données suivantes :</p>
              <div className="space-y-4">
                {[
                  {
                    title: "Données d'identification",
                    items: [
                      "Nom d'utilisateur, adresse email",
                      "Photo de profil (optionnel)",
                      "Liens vers les réseaux sociaux (optionnel)",
                    ],
                  },
                  {
                    title: "Données d'utilisation",
                    items: [
                      "Morceaux ajoutés à la bibliothèque et leur progression",
                      "Sessions de pratique (durée, BPM, notes)",
                      "Covers publiées (fichiers vidéo/audio)",
                      "Interactions sociales (amis, feed, challenges)",
                      "Setlists créées",
                    ],
                  },
                  {
                    title: "Données techniques",
                    items: [
                      "Adresse IP, type de navigateur",
                      "Système d'exploitation, type d'appareil",
                      "Pages visitées et actions effectuées",
                    ],
                  },
                  {
                    title: "Données de paiement",
                    items: [
                      "Traitées directement par Stripe",
                      "Nous ne stockons aucune donnée bancaire",
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
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                4
              </span>
              Finalités du traitement
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Vos données personnelles sont traitées pour les finalités
                suivantes :
              </p>
              <ul className="ml-1 space-y-2.5">
                {[
                  "Création et gestion de votre compte utilisateur",
                  "Fourniture et personnalisation du service",
                  "Suivi de votre progression musicale",
                  "Fonctionnement des fonctionnalités sociales (amis, feed, challenges)",
                  "Gestion des abonnements et des paiements",
                  "Envoi de notifications push (avec votre consentement)",
                  "Amélioration du service et analyse d'utilisation",
                  "Communication relative au service (mises à jour, maintenance)",
                  "Respect de nos obligations légales",
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
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                5
              </span>
              Base légale du traitement
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Le traitement de vos données repose sur les bases légales
                suivantes :
              </p>
              <div className="space-y-3">
                {[
                  {
                    base: "Exécution du contrat",
                    desc: "Le traitement est nécessaire à la fourniture du service auquel vous avez souscrit (création de compte, suivi de progression, fonctionnalités sociales).",
                  },
                  {
                    base: "Consentement",
                    desc: "Pour l'envoi de notifications push et la collecte de cookies non essentiels. Vous pouvez retirer votre consentement à tout moment.",
                  },
                  {
                    base: "Intérêt légitime",
                    desc: "Pour l'amélioration du service, la prévention de la fraude et la sécurisation de la plateforme.",
                  },
                  {
                    base: "Obligation légale",
                    desc: "Pour le respect de nos obligations fiscales et comptables liées aux transactions payantes.",
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
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                6
              </span>
              Durée de conservation
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Vos données personnelles sont conservées pendant la durée
                nécessaire aux finalités pour lesquelles elles ont été
                collectées :
              </p>
              <div className="rounded-xl border border-border bg-card/50 p-5">
                <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                  <div className="flex gap-3">
                    <span className="w-48 shrink-0 font-medium text-foreground">
                      Données du compte
                    </span>
                    <span>
                      Durée de vie du compte + 30 jours après suppression
                    </span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex gap-3">
                    <span className="w-48 shrink-0 font-medium text-foreground">
                      Données d&apos;utilisation
                    </span>
                    <span>Durée de vie du compte</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex gap-3">
                    <span className="w-48 shrink-0 font-medium text-foreground">
                      Covers et médias
                    </span>
                    <span>
                      Supprimés sous 30 jours après suppression du compte
                    </span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex gap-3">
                    <span className="w-48 shrink-0 font-medium text-foreground">
                      Données de paiement
                    </span>
                    <span>
                      Conservées par Stripe selon leur politique propre
                    </span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex gap-3">
                    <span className="w-48 shrink-0 font-medium text-foreground">
                      Logs techniques
                    </span>
                    <span>12 mois maximum</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 7. Partage des données */}
          <section id="partage" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                7
              </span>
              Partage des données
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Vos données personnelles ne sont jamais vendues à des tiers.
                Elles peuvent être partagées avec les prestataires suivants,
                dans le cadre strict du fonctionnement du service :
              </p>
              <div className="space-y-3">
                {[
                  {
                    name: "Supabase",
                    role: "Hébergement de la base de données, authentification, stockage de fichiers",
                  },
                  {
                    name: "Vercel",
                    role: "Hébergement de l'application web",
                  },
                  {
                    name: "Stripe",
                    role: "Traitement des paiements",
                  },
                  {
                    name: "Spotify",
                    role: "Intégration musicale (recherche de morceaux, si connecté)",
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
                Vos données peuvent également être communiquées sur réquisition
                judiciaire ou en cas d&apos;obligation légale.
              </p>
            </div>
          </section>

          {/* 8. Transferts internationaux */}
          <section id="transferts" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                8
              </span>
              Transferts internationaux
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Certains de nos prestataires (Supabase, Vercel, Stripe) sont
                basés aux États-Unis. Les transferts de données vers les
                États-Unis sont encadrés par les clauses contractuelles types
                approuvées par la Commission européenne et/ou le cadre EU-US
                Data Privacy Framework.
              </p>
              <p>
                Nous nous assurons que ces prestataires offrent des garanties
                suffisantes pour la protection de vos données conformément au
                RGPD.
              </p>
            </div>
          </section>

          {/* 9. Cookies */}
          <section id="cookies" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                9
              </span>
              Cookies et technologies similaires
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Ostinara utilise des cookies strictement nécessaires au
                fonctionnement du service :
              </p>
              <div className="space-y-3">
                {[
                  {
                    name: "Cookies d'authentification",
                    desc: "Maintien de votre session de connexion. Essentiels au fonctionnement du service.",
                    essential: true,
                  },
                  {
                    name: "Cookies de préférences",
                    desc: "Mémorisation de vos paramètres (thème, langue). Essentiels à votre expérience.",
                    essential: true,
                  },
                  {
                    name: "Stockage local (LocalStorage)",
                    desc: "Fonctionnement de l'application PWA et mise en cache des données hors-ligne.",
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
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          Essentiel
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
                Ostinara n&apos;utilise actuellement aucun cookie publicitaire
                ou de traçage tiers.
              </p>
            </div>
          </section>

          {/* 10. Vos droits */}
          <section id="droits" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                10
              </span>
              Vos droits
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Conformément au RGPD, vous disposez des droits suivants
                concernant vos données personnelles :
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    right: "Droit d'accès",
                    desc: "Obtenir la confirmation que vos données sont traitées et en recevoir une copie.",
                  },
                  {
                    right: "Droit de rectification",
                    desc: "Corriger vos données inexactes ou incomplètes.",
                  },
                  {
                    right: "Droit à l'effacement",
                    desc: "Demander la suppression de vos données dans les conditions prévues par le RGPD.",
                  },
                  {
                    right: "Droit à la portabilité",
                    desc: "Recevoir vos données dans un format structuré et les transmettre à un autre service.",
                  },
                  {
                    right: "Droit d'opposition",
                    desc: "Vous opposer au traitement de vos données pour des motifs légitimes.",
                  },
                  {
                    right: "Droit à la limitation",
                    desc: "Demander la suspension du traitement de vos données dans certains cas.",
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
                Pour exercer ces droits, contactez-nous à{" "}
                <a
                  href="mailto:contact@ostinara.app"
                  className="font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
                >
                  contact@ostinara.app
                </a>
                . Nous répondrons à votre demande dans un délai de 30 jours.
              </p>
              <p>
                Vous disposez également du droit d&apos;introduire une
                réclamation auprès de la{" "}
                <span className="font-medium text-foreground">CNIL</span>{" "}
                (Commission Nationale de l&apos;Informatique et des Libertés) si
                vous estimez que le traitement de vos données n&apos;est pas
                conforme à la réglementation.
              </p>
            </div>
          </section>

          {/* 11. Sécurité */}
          <section id="securite" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                11
              </span>
              Sécurité des données
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Nous mettons en œuvre des mesures techniques et
                organisationnelles appropriées pour protéger vos données
                personnelles contre tout accès non autorisé, modification,
                divulgation ou destruction :
              </p>
              <ul className="ml-1 space-y-2.5">
                {[
                  "Chiffrement des données en transit (HTTPS/TLS)",
                  "Chiffrement des données au repos via Supabase",
                  "Authentification sécurisée avec gestion des sessions",
                  "Accès restreint aux données selon le principe du moindre privilège",
                  "Mises à jour régulières des dépendances et correctifs de sécurité",
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
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                12
              </span>
              Modifications de la politique
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Nous pouvons mettre à jour cette politique de confidentialité
                pour refléter les changements apportés à nos pratiques ou pour
                d&apos;autres raisons opérationnelles, légales ou
                réglementaires.
              </p>
              <p>
                En cas de modification substantielle, nous vous en informerons
                par notification dans l&apos;application ou par email. La date
                de dernière mise à jour en haut de cette page sera également
                actualisée.
              </p>
            </div>
          </section>

          {/* 13. Contact */}
          <section id="contact" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                13
              </span>
              Contact
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Pour toute question relative à la protection de vos données
                personnelles ou pour exercer vos droits, vous pouvez nous
                contacter :
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
                Nous nous engageons à répondre à toute demande dans un délai
                raisonnable et au plus tard dans les 30 jours suivant la
                réception de votre demande.
              </p>
            </div>
          </section>
        </div>

        {/* Cross-links */}
        <div className="mt-16 rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-8">
          <h3 className="mb-4 text-lg font-semibold">Voir aussi</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/mentions-legales"
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
                </svg>
              </div>
              <div>
                <div className="font-medium transition-colors group-hover:text-primary">
                  Mentions légales
                </div>
                <div className="text-xs text-muted-foreground">
                  Informations légales obligatoires
                </div>
              </div>
            </Link>
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
          </div>
        </div>
      </div>
    </div>
  );
}
