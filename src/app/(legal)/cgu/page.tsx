import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation - Ostinara",
  description:
    "Conditions Générales d'Utilisation du service Ostinara. Règles d'utilisation, droits et obligations des utilisateurs.",
};

const sections = [
  { id: "objet", label: "Objet" },
  { id: "acceptation", label: "Acceptation des conditions" },
  { id: "description", label: "Description du service" },
  { id: "inscription", label: "Inscription et compte" },
  { id: "offres", label: "Offres et tarification" },
  { id: "contenu", label: "Contenu utilisateur" },
  { id: "propriete", label: "Propriété intellectuelle" },
  { id: "obligations", label: "Obligations de l'utilisateur" },
  { id: "responsabilite", label: "Responsabilité" },
  { id: "donnees", label: "Données personnelles" },
  { id: "modification", label: "Modification des CGU" },
  { id: "resiliation", label: "Résiliation" },
  { id: "droit", label: "Droit applicable" },
];

export default function CGU() {
  return (
    <div className="relative">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border py-20">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-pulse-glow absolute -top-1/2 right-1/3 h-[600px] w-[600px] rounded-full bg-chart-5/15 blur-[120px]" />
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
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Document légal
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Conditions Générales d&apos;Utilisation
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Les présentes CGU définissent les règles d&apos;utilisation du
            service Ostinara ainsi que les droits et obligations des
            utilisateurs.
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
          {/* 1. Objet */}
          <section id="objet" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                1
              </span>
              Objet
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Les présentes Conditions Générales d&apos;Utilisation (ci-après
                « CGU ») ont pour objet de définir les conditions dans
                lesquelles les utilisateurs peuvent accéder et utiliser le
                service Ostinara, une application web progressive (PWA) dédiée
                aux guitaristes.
              </p>
              <p>
                Le service permet notamment de gérer une bibliothèque de
                morceaux, suivre sa progression, enregistrer et partager des
                covers, et interagir avec d&apos;autres musiciens.
              </p>
            </div>
          </section>

          {/* 2. Acceptation */}
          <section id="acceptation" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                2
              </span>
              Acceptation des conditions
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                L&apos;utilisation du service Ostinara implique
                l&apos;acceptation pleine et entière des présentes CGU.
                L&apos;inscription au service vaut acceptation sans réserve de
                l&apos;ensemble des dispositions ci-après.
              </p>
              <p>
                Si vous n&apos;acceptez pas les présentes conditions, vous ne
                devez pas utiliser le service.
              </p>
            </div>
          </section>

          {/* 3. Description du service */}
          <section id="description" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                3
              </span>
              Description du service
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>Ostinara propose les fonctionnalités suivantes :</p>
              <ul className="ml-1 space-y-2.5">
                {[
                  "Bibliothèque personnelle de morceaux avec suivi de progression",
                  "Journal de pratique avec historique et statistiques",
                  "Enregistrement et partage de covers (vidéo et audio)",
                  "Métronome intégré pour les sessions de pratique",
                  "Création de setlists",
                  "Système social : amis, feed d'activité, challenges",
                  "Intégrations tierces (Spotify, recherche de tablatures)",
                  "Mode Jam Session collaboratif",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <p>
                L&apos;éditeur se réserve le droit de modifier, suspendre ou
                supprimer tout ou partie des fonctionnalités du service à tout
                moment, sans préavis.
              </p>
            </div>
          </section>

          {/* 4. Inscription et compte */}
          <section id="inscription" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                4
              </span>
              Inscription et compte utilisateur
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                L&apos;accès au service nécessite la création d&apos;un compte
                utilisateur. L&apos;utilisateur s&apos;engage à fournir des
                informations exactes et à jour lors de son inscription.
              </p>
              <p>
                L&apos;utilisateur est responsable de la confidentialité de ses
                identifiants de connexion et de toute activité effectuée depuis
                son compte. En cas d&apos;utilisation non autorisée de son
                compte, l&apos;utilisateur doit en informer immédiatement
                l&apos;éditeur.
              </p>
              <p>
                L&apos;éditeur se réserve le droit de suspendre ou supprimer
                tout compte qui contreviendrait aux présentes CGU, sans préavis
                ni indemnité.
              </p>
            </div>
          </section>

          {/* 5. Offres et tarification */}
          <section id="offres" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                5
              </span>
              Offres et tarification
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Ostinara propose plusieurs niveaux d&apos;abonnement :
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    name: "Free",
                    desc: "Accès limité (10 morceaux, 3 covers, 5 amis)",
                  },
                  {
                    name: "Pro",
                    desc: "Accès illimité, statistiques avancées",
                  },
                  {
                    name: "Band",
                    desc: "Fonctionnalités Pro + espaces de groupe",
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
                Les paiements sont traités de manière sécurisée par{" "}
                <span className="font-medium text-foreground">Stripe</span>.
                L&apos;éditeur ne stocke aucune donnée bancaire.
              </p>
              <p>
                Les abonnements payants sont renouvelés automatiquement sauf
                résiliation par l&apos;utilisateur avant la fin de la période en
                cours. L&apos;utilisateur peut gérer son abonnement depuis la
                page « Mon abonnement » de son compte.
              </p>
            </div>
          </section>

          {/* 6. Contenu utilisateur */}
          <section id="contenu" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                6
              </span>
              Contenu utilisateur
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                L&apos;utilisateur est seul responsable du contenu qu&apos;il
                publie sur Ostinara (covers, notes, commentaires, etc.). Il
                garantit détenir tous les droits nécessaires à la publication de
                ce contenu.
              </p>
              <p>
                L&apos;utilisateur accorde à Ostinara une licence non exclusive,
                mondiale et gratuite pour héberger, afficher et distribuer son
                contenu dans le cadre du fonctionnement du service.
              </p>
              <p>Il est strictement interdit de publier du contenu :</p>
              <ul className="ml-1 space-y-2.5">
                {[
                  "Illicite, diffamatoire, injurieux ou discriminatoire",
                  "Portant atteinte aux droits de propriété intellectuelle de tiers",
                  "Contenant des données personnelles de tiers sans leur consentement",
                  "À caractère publicitaire ou commercial non autorisé",
                  "Contenant des virus ou tout autre programme malveillant",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                    {item}
                  </li>
                ))}
              </ul>
              <p>
                L&apos;éditeur se réserve le droit de supprimer tout contenu
                contrevenant aux présentes CGU, sans préavis ni indemnité.
              </p>
            </div>
          </section>

          {/* 7. Propriété intellectuelle */}
          <section id="propriete" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                7
              </span>
              Propriété intellectuelle
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Le service Ostinara, son code source, son design, ses
                fonctionnalités et l&apos;ensemble de ses contenus éditoriaux
                sont la propriété exclusive de l&apos;éditeur et sont protégés
                par le droit de la propriété intellectuelle.
              </p>
              <p>
                L&apos;utilisateur n&apos;acquiert aucun droit de propriété
                intellectuelle sur le service ni sur ses composants. Il
                bénéficie uniquement d&apos;un droit d&apos;usage personnel et
                non cessible dans le cadre de son utilisation normale du
                service.
              </p>
            </div>
          </section>

          {/* 8. Obligations de l'utilisateur */}
          <section id="obligations" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                8
              </span>
              Obligations de l&apos;utilisateur
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>L&apos;utilisateur s&apos;engage à :</p>
              <ul className="ml-1 space-y-2.5">
                {[
                  "Utiliser le service conformément à sa destination et aux présentes CGU",
                  "Ne pas tenter de contourner les mesures de sécurité du service",
                  "Ne pas utiliser de systèmes automatisés (bots, scripts) pour accéder au service",
                  "Respecter les droits des autres utilisateurs et les droits de propriété intellectuelle",
                  "Ne pas usurper l'identité d'un autre utilisateur",
                  "Signaler tout contenu ou comportement inapproprié",
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
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                9
              </span>
              Responsabilité
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                L&apos;éditeur met en œuvre les moyens raisonnables pour assurer
                la disponibilité et le bon fonctionnement du service, sans
                toutefois garantir un accès ininterrompu ou exempt
                d&apos;erreurs.
              </p>
              <p>
                Le service est fourni « en l&apos;état ». L&apos;éditeur ne
                saurait être tenu responsable des dommages directs ou indirects
                résultant de l&apos;utilisation ou de l&apos;impossibilité
                d&apos;utiliser le service, y compris la perte de données ou
                tout préjudice financier.
              </p>
              <p>
                L&apos;éditeur n&apos;est pas responsable du contenu publié par
                les utilisateurs ni des échanges entre utilisateurs dans le
                cadre des fonctionnalités sociales du service (feed, challenges,
                jam sessions).
              </p>
            </div>
          </section>

          {/* 10. Données personnelles */}
          <section id="donnees" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                10
              </span>
              Données personnelles
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Le traitement des données personnelles des utilisateurs est
                effectué conformément au Règlement Général sur la Protection des
                Données (RGPD) et à la loi Informatique et Libertés.
              </p>
              <p>
                Pour plus d&apos;informations sur la collecte, le traitement et
                la protection de vos données personnelles, veuillez consulter
                notre{" "}
                <Link
                  href="/politique-confidentialite"
                  className="font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
                >
                  Politique de confidentialité
                </Link>
                .
              </p>
            </div>
          </section>

          {/* 11. Modification des CGU */}
          <section id="modification" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                11
              </span>
              Modification des CGU
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                L&apos;éditeur se réserve le droit de modifier les présentes CGU
                à tout moment. Les utilisateurs seront informés de toute
                modification substantielle par notification dans
                l&apos;application ou par email.
              </p>
              <p>
                La poursuite de l&apos;utilisation du service après la
                modification des CGU vaut acceptation des nouvelles conditions.
                Si l&apos;utilisateur n&apos;accepte pas les modifications, il
                doit cesser d&apos;utiliser le service et supprimer son compte.
              </p>
            </div>
          </section>

          {/* 12. Résiliation */}
          <section id="resiliation" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                12
              </span>
              Résiliation
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                L&apos;utilisateur peut résilier son compte à tout moment depuis
                les paramètres de son profil. La résiliation entraîne la
                suppression de son compte et de l&apos;ensemble de ses données,
                conformément à notre politique de conservation des données.
              </p>
              <p>
                En cas de manquement aux présentes CGU, l&apos;éditeur peut
                suspendre ou supprimer le compte de l&apos;utilisateur de
                manière immédiate, sans préavis ni indemnité, et sans préjudice
                de tout dommage et intérêt que l&apos;éditeur pourrait
                réclamer.
              </p>
            </div>
          </section>

          {/* 13. Droit applicable */}
          <section id="droit" className="scroll-mt-24">
            <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                13
              </span>
              Droit applicable et litiges
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Les présentes CGU sont soumises au droit français. En cas de
                litige relatif à l&apos;interprétation ou à
                l&apos;exécution des présentes conditions, les parties
                s&apos;engagent à rechercher une solution amiable avant toute
                action judiciaire.
              </p>
              <p>
                Conformément aux dispositions du Code de la consommation
                relatives au règlement amiable des litiges, l&apos;utilisateur
                peut recourir gratuitement au service de médiation proposé par
                l&apos;éditeur. À défaut de résolution amiable, le litige sera
                porté devant les tribunaux compétents.
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
