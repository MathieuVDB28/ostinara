# CLAUDE.md - Ostinara

## Presentation du projet

**Ostinara** est une application PWA destinee aux musiciens (guitare, basse, batterie, clavier, autre) qui souhaitent tracker leur progression, gerer leur repertoire, partager leurs covers avec leurs amis et faire vivre leur groupe. L'objectif est de centraliser tout ce dont un musicien a besoin au meme endroit, seul ou en groupe.

**Cible** : Musiciens amateurs a intermediaires qui veulent suivre leur apprentissage et partager avec leur cercle d'amis musiciens ; groupes (plan Band) ou chaque membre joue un instrument different.

> L'app a ete concue pour la guitare puis ouverte a tous les instruments (octobre 2026) : voir la section **Instruments** ci-dessous. Elle est bilingue francais / anglais depuis octobre 2026 : voir **Langues (i18n)**. Certaines parties de ce document decrivant les pages (routes `/library`, `/practice`…) datent d'avant la refonte de navigation (Accueil / Jouer / Biblio / Commu / Profil, cf. `src/lib/navigation.ts`).

---

## Stack technique

| Element | Technologie |
|---------|-------------|
| Framework | Next.js 16+ (App Router) |
| React | React 19 |
| PWA | next-pwa 5.6 |
| Langage | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 (via @tailwindcss/postcss) |
| Backend/BDD | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Paiements | Stripe (API 2025-12-15.clover) |
| Deploiement | Vercel |
| Stockage media | Supabase Storage (uploads resumables via Tus protocol) |
| Charts | Recharts 3 |
| Drag & Drop | @dnd-kit (core + sortable) |
| PDF | @react-pdf/renderer |
| Video | @ffmpeg/ffmpeg (WASM, compression client-side) |
| Themes | next-themes (light/dark) |
| Catalogue musical | Deezer (recherche, pochettes, extraits, tempo) |
| Emails | Resend (fetch, sans SDK) |

---

## Structure du projet

```
ostinara/
├── src/
│   ├── app/
│   │   ├── (auth)/               # Pages login/register
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (main)/               # Layout principal authentifie
│   │   │   ├── dashboard/        # Dashboard utilisateur
│   │   │   ├── library/          # Bibliotheque de morceaux
│   │   │   ├── progress/         # Tracker de progression
│   │   │   ├── practice/         # Mode pratique avec metronome
│   │   │   ├── covers/           # Gestion des covers
│   │   │   ├── albums/           # Reviews d'albums
│   │   │   ├── setlists/         # Setlists + repetitions
│   │   │   │   ├── [id]/         # Detail setlist
│   │   │   │   └── rehearsals/[id]/ # Detail repetition
│   │   │   ├── challenges/       # Defis entre amis
│   │   │   ├── friends/          # Cercle d'amis
│   │   │   ├── feed/             # Feed d'activite
│   │   │   ├── jam/[id]/         # Session jam realtime
│   │   │   ├── audio/            # Identification audio + accordeur
│   │   │   ├── pricing/          # Plans et tarifs
│   │   │   ├── profile/edit/     # Edition profil
│   │   │   └── account/subscription/ # Gestion abonnement
│   │   ├── (legal)/              # Pages legales
│   │   │   ├── cgu/
│   │   │   ├── mentions-legales/
│   │   │   └── politique-confidentialite/
│   │   ├── api/
│   │   │   ├── auth/callback/    # Callback OAuth Supabase
│   │   │   ├── catalog/          # Recherche catalogue (Deezer)
│   │   │   ├── tabs/             # Recherche tabs (Songsterr)
│   │   │   ├── audio/identify/   # Identification audio (AudD.io)
│   │   │   ├── push/subscribe/   # Push notifications
│   │   │   ├── stripe/           # Checkout + portal + webhooks
│   │   │   ├── cron/             # Rappels repetitions (daily 8h UTC)
│   │   │   └── rehearsals/[id]/ics/ # Export iCalendar
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                   # Composants UI reutilisables
│   │   ├── layout/               # Sidebars, nav, bottom tab bar
│   │   ├── library/              # Bibliotheque + playlists
│   │   ├── progress/             # Sessions, stats, charts
│   │   ├── practice/             # Metronome, exercices
│   │   ├── covers/               # Upload et gestion covers
│   │   ├── albums/               # Reviews d'albums
│   │   ├── social/               # Feed, activites, reactions
│   │   ├── friends/              # Amis et profils
│   │   ├── setlists/             # Setlists, bands, repetitions
│   │   ├── rehearsals/           # Planning repetitions
│   │   ├── challenges/           # Defis et leaderboard
│   │   ├── jam/                  # Session jam realtime
│   │   ├── audio/                # Identificateur + accordeur
│   │   ├── profile/              # Profil, favoris, liens sociaux
│   │   ├── subscription/         # Pricing, upsell, gestion plan
│   │   ├── pwa/                  # Push notifications, service worker
│   │   ├── dashboard/            # Vue dashboard
│   │   └── providers/            # Theme provider
│   ├── lib/
│   │   ├── supabase/             # Clients browser + server + middleware
│   │   ├── stripe/               # Config plans, clients server + browser
│   │   ├── notifications/        # VAPID, envoi push, logs
│   │   ├── hooks/                # useMetronome, useJamSession, useAudioRecorder, usePitchDetection, useBandChat
│   │   ├── services/             # Deezer, Songsterr, tempo
│   │   └── actions/              # 20 fichiers de server actions
│   ├── types/
│   │   └── index.ts              # Tous les types (1300+ lignes)
│   └── middleware.ts             # Protection routes + redirections auth
├── public/
│   ├── icons/                    # Icones PWA
│   └── sw-push-handler.js        # Service worker push custom
├── next.config.mjs               # Config Next.js + PWA + caching
├── vercel.json                   # Cron jobs
└── package.json
```

---

## Architecture et patterns

### Pattern page/view
Les pages sont des Server Components qui fetchent les donnees puis les passent a un composant `"use client"` (ex: `*-view.tsx`) :
```
page.tsx (Server Component) → fetch data → <FeatureView data={data} />
```

### Server Actions
Tous les fichiers dans `src/lib/actions/` suivent ce pattern :
```tsx
"use server";
import { createClient } from "@/lib/supabase/server";

export async function myAction(input: InputType) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifie" };
  // ... logique metier
  revalidatePath("/some-path");
  return { success: true, data };
}
```

### Supabase clients
- **Server Components / Server Actions** : `createClient()` depuis `@/lib/supabase/server` (cookie-based)
- **Client Components** : `createBrowserClient()` depuis `@/lib/supabase/client`
- **Middleware** : Client specifique dans `@/lib/supabase/middleware`

### Realtime (Supabase)
- **Jam Sessions** : Presence tracking + Broadcast (metronome sync, song change) via `useJamSession` hook
- **Band Chat** : postgres_changes (INSERT/DELETE) via `useBandChat` hook
- **Channels** : Pattern `{feature}:{id}` (ex: `band-chat:abc123`, `jam:xyz789`)

### Instruments (multi-instrument)
Chaque musicien declare ses instruments a l'onboarding (`/bienvenue`, impose par `(main)/layout.tsx` tant que `profile_instruments` est vide) et les modifie dans Profil > Reglages > Mes instruments.
- **Valeurs** : enum `instrument` = `guitar | bass | drums | keys | other` (+ `custom_label` pour « autre »). Pas de chant comme instrument d'app ; dans un groupe, le chant passe par le poste « autre » nomme.
- **Libelles, icones, ordres, categories d'exercices par instrument, types de matos par instrument** : `src/lib/instruments.ts` (client + serveur). `getMyPrimaryInstrument()` (serveur, cache par requete) : `src/lib/instruments-server.ts`.
- **Cote client** : `InstrumentsProvider` (monte dans `(main)/layout.tsx`) → `useMyInstruments()` donne `{ instruments, primary, isMulti, plays() }`. Les selecteurs d'instrument (`InstrumentSwitch`) ne s'affichent que si `isMulti`.
- **Statut par instrument d'un morceau** : table `song_parts` (un statut + progression par instrument). `songs.status` / `songs.progress_percent` sont la **synthese** (le meilleur des parties), tenue par trigger : ne jamais les ecrire directement, passer par `updateSong(id, { instrument?, status?, progress_percent? })` (instrument absent = principal). Un morceau cree recoit automatiquement la partie de l'instrument principal (trigger).
- **Sessions** : `practice_sessions.instrument` ; la progression au tempo (`syncSongProgressFromTempo(songId, instrument)`) est calculee par instrument.
- **Exercices** : `exercises.instruments` (vide = pour tous) ; `getExercises()` ne renvoie que ceux de mes instruments (+ les miens).
- **Groupes** : `band_members.instrument` / `instrument_label` = poste tenu dans le groupe (instrument principal par defaut, trigger), modifiable via la RPC `set_band_member_instrument`. Line-up des repetes : `src/lib/rehearsal-lineup.ts`.
- **Accordeur** : guitare + basse (`BASS_TUNING_GROUPS`, detection jusqu'a 28 Hz) ; masque pour batterie/clavier.
- **Badges** : `titles` par instrument dans `src/lib/badges/catalog.ts` (ex. « Corne aux doigts » / « Ampoules aux baguettes » / « Ivoire usé »), via `badgeLabel(id, level, instrument)`.

### Langues (i18n)
Francais et anglais, avec **next-intl sans routage** : pas de prefixe dans les URL, la langue vit dans le cookie `NEXT_LOCALE` et dans `profile_private.locale`.
- **Detection** (`src/i18n/detect.ts`, appelee par le middleware a la premiere visite) : pays de l'IP (`x-vercel-ip-country`) — francais dans les pays francophones, anglais ailleurs ; pays bilingues (BE, CH, CA, LU…) ou pas d'en-tete : langue du navigateur ; a defaut le francais. Un cookie existant n'est jamais ecrase. Changement : Profil > Reglages > Langue (`LocaleSwitcher`, action `setLocale`), ou le selecteur compact des pages publiques (auth, landing, legal, onboarding).
- **Messages** : `messages/{fr,en}/<namespace>.json`, un fichier par domaine. `messages/*/index.ts` est **genere** par `npm run check:i18n` (qui verifie aussi que fr et en ont les memes cles et les memes variables ICU) : le lancer apres tout ajout de cle, avant `tsc`. Les cles sont typees (`src/global.d.ts`) : une cle absente casse la compilation.
- **Ecrire un texte** : jamais de chaine en dur dans l'UI. Client et composants serveur synchrones : `useTranslations("ns")` ; serveur async / server actions : `getTranslations`. Pluriels et variables en ICU (`{count, plural, one {# morceau} other {# morceaux}}`), mise en forme avec `t.rich` (`<strong>`, `<accent>`, `<link>`). Enums (instrument, statut, humeur, type de matos…) : namespace `enums` (``te(`gearType.${type}`)``) ; libelles avec traducteur : `instrumentLabel(entry, te)`, `badgeLabel(id, level, instrument, t)`, etc.
- **Dates et nombres** : `useIntlLocale()` (client) / `getIntlLocale()` (serveur) → `"fr-FR"` / `"en-US"` ; jamais `"fr-FR"` en dur. Prix toujours en EUR (`Intl.NumberFormat` avec `currency: "EUR"`).
- **Erreurs des server actions** : `return { success: false, error: await tErr("cle") }` (`src/i18n/server.ts`, namespace `errors`).
- **Sans requete** (push, cron, emails) : la langue du destinataire, `profile_private.locale` (`recipientLocale()`). `sendPushNotification` accepte un payload fonction `(t, locale) => ({ title, body })` evalue par destinataire. Email de la liste d'attente : `waitlist.locale`, traducteur passe a `waitlistConfirmationEmail`. Emails d'auth Supabase : `locale` est dans les metadonnees du compte (`{{ if eq .Data.locale "en" }}` dans les templates).
- **Contenu en base** : exercices systeme traduits dans `exercises.translations` (`localizeExercise`). Ce que l'utilisateur ecrit (titres, notes) reste tel quel ; quelques valeurs anciennes stockees en francais (unites du plan de la semaine) sont rattrapees a l'affichage.
- **Cas particuliers** : `/offline` est statique (pre-rendue au build) et choisit sa langue cote client (`OfflineIntl`). Le PDF (react-pdf) est rendu hors de l'arbre React : les traducteurs lui arrivent en props. Pages legales : `legal-fr.tsx` (texte de reference) + `legal-en.tsx` (traduction) dans chaque dossier, bandeau « seule la version francaise fait foi » en anglais ; toute modification du texte francais doit etre reportee dans l'anglais.

### Plan gating
- Fonction `requirePaidPlan()` dans `src/lib/actions/plan.ts`
- Composant `ProUpsell` affiche partout pour les features Pro/Band ; `plan="band"` pour une fonction reservee au Band (jam, chat de groupe, fiche technique)
- Verification cote serveur dans les server actions (limites de creation)

### Uploads fichiers
- **Protocol** : Tus (resumable uploads) vers Supabase Storage
- **Compression video** : FFmpeg WASM pour les fichiers > 50MB
- **Buckets** : `covers` (video/audio, 200MB limit), `avatars` (images)
- **Covers privees** (migration `20261112_private_covers_bucket`) : `covers.media_url` garde le chemin dans le bucket (les anciennes lignes, l'URL publique ; `coverStoragePath` lit les deux). Toute fonction serveur qui renvoie des covers passe ses lignes, lues sous RLS, a `signCoverMedia` ; une cover ne pointe que vers un fichier du dossier de son auteur (trigger `check_cover_media_owner`).

---

## Fonctionnalites detaillees

### Dashboard (`/dashboard`)
- Salutation avec avatar
- Compteurs : morceaux en cours, maitrises, covers, reviews albums
- 5 dernieres sessions de pratique
- Setlists recentes

### Bibliotheque (`/library`)
- **3 onglets** : Bibliotheque / Wishlist / Playlists
- CRUD morceaux avec recherche dans le catalogue (Deezer) ou saisie manuelle
- Filtres avances : difficulte, accordage, capo
- Tri : date, titre, progression, difficulte
- Chaque morceau stocke : titre, artiste, album, cover, deezer_id, difficulte, statut (synthese) + statut par instrument (`song_parts`), progression %, accordage, capo, tabs URL, notes, BPM cible, donnees de tab Songsterr (tempo, sections)
- **Playlists** : creation, edition, reordonnement, ajout/retrait morceaux
- **Recherche tabs** : integration Songsterr (Pro/Band)

### Progression (`/progress`)
- **2 onglets** : Journal / Statistiques
- **Journal** : historique des sessions avec filtres, timer integre
- **Sessions** : duree, BPM atteint, humeur (5 niveaux emoji), energie (3 niveaux), sections travaillees, objectifs, notes
- **Session passee** : « Deja jouee ? » sous le deroule de Jouer (Session / Setlist) ouvre la modale de fin avec les morceaux ; « Ajouter une session passee » dans le Carnet l'ouvre vide (`openPastSession` / `openManualEntry` du `PracticeSessionProvider`). En saisie manuelle, les morceaux sans duree se partagent le temps total.
- **Exercices d'une session** : leur temps s'ajoute a la ligne sans morceau de la session (creee au besoin) et chacun y est rattache dans `practice_session_exercises` (fiche ou exo express : `exercise_name` / `exercise_category`, migration `20261107_session_exercises`). Le chrono compte le temps par exercice (`setExercise` du provider) comme par morceau ; la progression (`user_exercises`) s'ecrit cote serveur avec la session.
- **Partage** : une session enregistree (chrono ou apres coup) cree l'activite `session_completed` (instantane dans `metadata` : duree, instrument, morceaux + BPM, exercices + BPM, humeur, sections, objectif, notes ; `reference_id` = `session_group_id` ou id de la ligne) et notifie les amis a chaque session. Case « Partager avec mes amis » dans la modale (defaut : `profile_private.share_sessions`, Profil > Reglages). Corriger ou supprimer la session met a jour ou retire l'activite (migration `20261106_session_activity`).
- **Statistiques** :
  - Heatmap calendrier (365 jours)
  - Graphique progression BPM par morceau
  - Distribution des humeurs (pie chart)
  - Repartition du temps par morceau (bar chart)
  - Resume : total sessions, total minutes, streak, plus long streak, morceau le plus pratique
  - Gratuit : heatmap, resume, serie. Pro/Band : courbes de tempo, humeurs, temps par morceau et par instrument (filtre serveur dans `getChartData`)
  - Serie : `computeStreak` (`src/lib/streak.ts`), seule regle de l'app, jours de Paris. Un jour manque ne la casse pas et ne l'augmente pas, deux la cassent. Stats, profil public, badges, rappels et defis passent par la.

### Sessions en direct (`/commu/direct/[id]`)
- Migration `20261115_live_sessions`. Le chrono reste dans `PracticeSessionProvider` ; `live_sessions` (une ligne par musicien, ecrite par le service role) recopie ce que les amis en voient, `src/lib/actions/live-sessions.ts`. Rien pour qui a coupe `share_sessions`.
- **Notification** : « X joue en ce moment » (`friend_playing`, `src/lib/notifications/live-sessions.ts`), une minute apres le lancement via `after()` : annuler avant ne previent personne. Cote reception : `profile_private.notify_friends_playing` (Profil > Reglages). « Session terminee » reprend le meme tag et remplace sans bruit le debut pour qui l'a recu (`takeLiveSessionAudience`, `renotify`).
- **Selon le plan de celui qui regarde** : Pro/Band voient le chrono, le morceau, le tempo, qui regarde et le chat (RLS + Realtime, `useLiveSessionState` / `useLiveAudience` / `useLiveChat`) ; Free n'a aucun droit de lecture et recoit un instantane du serveur (qui, instrument, depuis quand) avec `ProUpsell`. Un musicien Free voit combien d'amis le regardent, sans chat ; ses amis abonnes y discutent entre eux.
- **Fin** : `ended_at` plutot que suppression (ceux qui regardent recoivent l'UPDATE), messages effaces. Sans nouvelle depuis 12 h (`LIVE_SESSION_TTL_MS`), la session n'est plus en direct ; le cron `practice-reminders` purge les lignes.

### Mode Practice (`/practice`)
- Selection de morceau pour pratiquer
- **Metronome integre** :
  - BPM ajustable (tap tempo disponible)
  - Signatures rythmiques : 4/4, 3/4, 6/8, 2/4, 5/4, 7/8, 12/8
  - Subdivisions : none, eighth, triplet, sixteenth
  - Pattern d'accents personnalisable
  - Mode silence (beats silencieux selectionnables)
  - Visualiseur de beat
  - Web Audio API (OscillatorNode + GainNode)
- **Exercices** :
  - Categories : scales, arpeggios, picking, chord_changes, fingerstyle, technique, rhythm, rudiments, grooves, fills, independence, slap, walking_bass, voicings, reading (ordre et sous-ensemble par instrument : `EXERCISE_CATEGORIES` dans `src/lib/instruments.ts`)
  - Exercices systeme pre-definis (guitare, basse, batterie, clavier, et mise en place pour tous) + exercices custom, chacun pour un instrument ou pour tous
  - Progression BPM : starting_bpm → target_bpm avec increment
  - Suivi de progression par exercice (best BPM, total minutes)
  - Partage d'exercices avec les amis

### Covers (`/covers`)
- Upload video/audio avec drag & drop
- Visibilite : suit le profil (Public sur un profil public, Amis sur un profil prive), case « Reservee a mes amis » ; `private` (moi seul) reste pour les anciennes
- Filtrage par visibilite
- Modal de detail : lecture, telechargement, modification visibilite, suppression
- Limite : 3 pour Free, 20 Go par personne en Pro/Band (taille lue dans `storage.objects`, RLS + trigger, migration `20261126_usage_caps`)

### Albums (`/albums`)
- Reviews d'albums avec note 1-10 et texte (max 2000 caracteres)
- Recherche albums via le catalogue (Deezer)
- Recommandations d'albums (Pro)
- CRUD reviews (gratuit)
- Feed des reviews des amis
- Plan gate : seules les recommandations sont Pro/Band
- **Encyclopedie** (gratuit) : sur `/albums/[id]` fiche Wikidata (sortie originale, studio, production, genre, label, album precedent/suivant) + article Wikipedia (intro, sections repliables) ; sur `/artists/[id]` line-up (qui joue quoi, « Ton poste ») + fiche + article. Service `src/lib/services/wikipedia.ts`, composants `src/components/albums/encyclopedia.tsx` (serveur, Suspense) / `wiki-panel.tsx` / `band-lineup.tsx`

### Equipe editoriale et blog
- **Equipe** : `profiles.staff_role` = `admin` (nomme les autres) | `editor` (ecrit sur le blog, modere). Jamais ecrit depuis le navigateur (trigger) : RPC `set_staff_role` / `review_staff_application` (admins). Policies via `is_staff()` / `is_staff_admin()`. Premier admin a la main dans le SQL editor (cf. migration `20261101_staff`). Demande : Profil > Reglages > « Ecrire pour Ostinara » (`/profil/reglages/equipe`, table `staff_applications`) ; examen sur `/admin`. Actions : `src/lib/actions/staff.ts`.
- **Blog** (migration `20261102_blog`) : `blog_posts` (contenu = JSON Tiptap, rendu par `src/components/blog/blog-content.tsx` en liste blanche, jamais de HTML stocke ; `locale` + `translation_group` pour les traductions ; publie = `status = 'published'` et `published_at` passe, une date future programme) et `blog_comments`. Bucket `blog` (images, ecriture equipe). Actions : `src/lib/actions/blog.ts`.
- **Pages** : publiques `/blog`, `/blog/[slug]`, `/blog/rss.xml` (sans compte, referencees : `sitemap.ts`, `robots.ts`, JSON-LD, hreflang) ; connecte, elles redirigent vers `/commu/blog` et `/commu/blog/[slug]`. Editeur (equipe) : `/commu/blog/ecrire` et `/commu/blog/ecrire/[id]`. Blocs propres : morceau (`songEmbed`, « Ajouter a ma biblio »), exercice systeme (`exerciseEmbed`, recopie fr/en, « Le travailler dans Jouer » → `/jouer?exercise=`) et metronome (`metronomeEmbed`), cf. `src/lib/blog/document.ts`. Les brouillons s'enregistrent tout seuls (4 s apres la derniere frappe) ; jamais un article en ligne ou programme.

### Forum
- Migration `20261103_forum` : `forum_topics` (texte brut, `slug` = titre + suffixe aleatoire, `locale`, rubrique `forum_category`, jusqu'a 4 photos du bucket `forum`, `gear` = fiche du Matos recopiee sans serie ni prix, `solved_reply_id` = meilleure reponse choisie par l'auteur, drapeaux `is_pinned/is_locked/is_hidden` reserves a l'equipe), `forum_replies` (`vote_count` tenu par trigger), `forum_reply_votes` (pas pour soi), `forum_reports` (signalements, traites par l'equipe). Les triggers BEFORE filtrent ce que chacun peut changer et limitent a 5 sujets / 60 reponses par 24 h hors equipe ; ils ne sont pas SECURITY DEFINER (ils lisent `current_user`), les compteurs AFTER le sont.
- Recherche : RPC `search_forum_topics(p_query, p_locale, p_any_word, p_limit)` (tsvector 'simple', bilingue) ; `p_any_word` sert « Ces sujets ressemblent au tien ».
- Pages : publiques `/forum`, `/forum/[slug]` (JSON-LD DiscussionForumPosting, recherches en noindex), dans l'app `/commu/forum`, `/commu/forum/[slug]`, `/commu/forum/nouveau`, `/commu/forum/[slug]/modifier`, `/commu/forum/moderation` (equipe). Filtres dans l'URL (`?q=&rubrique=&filtre=sans-reponse|resolus&langues=toutes&page=`), cf. `parseForumParams` dans `src/lib/forum.ts`. Actions : `src/lib/actions/forum.ts`. Push : `forum_reply` (a tous ceux qui suivent le sujet), `forum_solved` (a l'auteur de la reponse choisie), `forum_mention`.
- Suivre : `forum_topic_follows` (l'auteur et ceux qui repondent suivent d'office, trigger ; `following = false` = desabonne, une nouvelle reponse ne reabonne pas). Les abonnes se lisent avec le service role.
- Mentions `@pseudo` (sujets et reponses) : `src/lib/mentions.ts` (pseudos `[A-Za-z0-9_.-]`, 10 max par message), saisie assistee `MentionTextarea` (participants du sujet d'abord), rendu dans `PlainText` (seuls les pseudos existants ressortent). Une personne mentionnee recoit la mention, pas en plus la notification d'abonne. Les modifications ne re-notifient pas.
- Badge « Coup de main » (`entraide`, famille commu, 1 / 10 / 25) : musiciens distincts dont le sujet a ete resolu par ma reponse, date `forum_topics.solved_at`.

### Setlists (`/setlists`)
- **3 onglets** : Setlists / Groupes / Repetitions
- **Setlists** :
  - Personnelles ou liees a un groupe
  - Items : morceaux (avec BPM, notes, sections jouees, tabs URL) ou separateurs de section
  - Drag & drop pour reordonnement (dnd-kit)
  - Export PDF (@react-pdf/renderer)
  - Ajout de morceaux depuis la collection personnelle ou celle des membres du groupe
- **Droits d'un groupe** (migration `20261119_band_access`, `src/lib/band-access.ts`) : c'est le plan du titulaire qui compte, plus celui de chaque membre. Tant qu'il a le plan Band, tout le groupe a jam, chat, repetes, setlists et fiche technique. S'il le quitte : 30 jours de grace (`bands.plan_lapsed_at`, tenu par la base), puis lecture seule (`band_is_active`, RLS) jusqu'a ce qu'il reprenne le plan ou transfere le groupe a un membre qui l'a (`transfer_band_ownership`). 5 membres au plus (migration `20261120_band_plan_five_people`), invitations en attente comprises ; le titulaire et les admins invitent.
- **Groupes (Bands)** :
  - Creation avec nom, description, cover
  - Roles : owner, admin, member
  - Invitation de membres
  - Gestion des membres (changer role, retirer)
  - Setlists partagees au sein du groupe
  - Notifications des setlists du groupe (`src/lib/notifications/band-setlists.ts`, migration `20261113_band_setlist_notifications`) : creation et suppression tout de suite aux membres (plus aux amis) ; les modifications sont notees dans `setlist_change_log` et partent en un resume quand l'auteur a fini (90 s de calme, minuteur dans `after()`, rattrapage des resumes restes en plan au geste suivant). Chacun coupe pour un groupe : `band_members.setlist_notifications`, RPC `set_band_setlist_notifications`, interrupteur sous les setlists de la page du groupe. Si la setlist est celle de la prochaine repete, ceux qui y vont (pas « decline ») recoivent le resume meme coupe, dans une version qui nomme la repete.
  - Historique d'une setlist de groupe : le meme journal, garde sans limite et lisible par les membres (RLS). « Modifiee par Lea il y a 2 h » sous le titre et section Historique en bas de `/setlists/[id]` (`getSetlistHistory`, un lot = un resume, `src/components/setlists/setlist-history.tsx`). Resume partage notif / page : `src/lib/setlist-changes.ts` (textes `setlists.changes`).
- **Repetitions (Rehearsals)** :
  - Planification : date, lieu (avec URL), setlist associee, notes
  - RSVP : invited, accepted, declined, maybe
  - Recurrence : none, weekly, biweekly, monthly
  - Chat par repetition, ou general au groupe (puce Chat de la page du groupe, plan Band, RLS comprise)
  - Export iCalendar (.ics)
  - Rappels automatiques par push (cron daily 8h UTC)
- **Series de repetes** (migration `20261123_rehearsal_series_tasks`) : supprimer « toutes » garde les repetes racontees ; supprimer la premiere seule rattache les suivantes a la plus ancienne. Une tache assignee a qui quitte le groupe revient au groupe entier (trigger).
- **Raconter une repete** (migration `20261122_rehearsal_logs`, `src/lib/actions/rehearsal-logs.ts`, `src/lib/rehearsal-log.ts`, page `/commu/groupes/[bandId]/raconter`, `?repete=` pour une repete existante ; `/commu/groupes/raconter` choisit le groupe depuis Jouer) : une repete planifiee ou jamais planifiee recoit un compte rendu, c'est la meme ligne de `rehearsals` (`logged_at`, `duration_minutes`). Tout membre d'un groupe actif peut l'ecrire ou le corriger (RPC `save_rehearsal_log`, sous RLS). Deux corrections simultanees ne s'ecrasent pas : le formulaire renvoie le `updated_at` lu a l'ouverture, et la RPC repond `conflict` (avec `rehearsals.updated_by`) si la repete a change depuis (migration `20261127_rehearsal_log_fixes`). Corriger la date deplace les sessions liees et l'activite (trigger `follow_rehearsal_date`) ; une repete racontee ne part pas dans le futur.
  - **Presents** : `rehearsal_attendees` (a cote de l'intention RSVP). Etre tague ne touche pas aux statistiques : le musicien confirme (`confirmRehearsalAttendance`, « Tu y etais ? », aussi depuis Accueil et en lecture seule), ce qui cree sa session (`practice_sessions.rehearsal_id`), le temps partage entre les morceaux joues ; ce qui n'est pas dans sa biblio va sur la ligne sans morceau. Seule l'insertion de la session ecrit « confirmed » (trigger) : le musicien ne peut pas l'ecrire lui-meme, et une session ne se relie qu'a une repete ou il est tague, une seule fois. Effacer sa session (ou la detacher) remet sa presence a confirmer et retire son activite (trigger) ; effacer la repete garde les sessions. Le journal du groupe ne compte que les presents confirmes.
  - **Verdicts** : `rehearsal_songs.verdict` (`rework` / `solid` / `ready`). L'etat du set d'une setlist de groupe est le dernier verdict de chaque morceau (`setlistReadiness`, retrouve par ligne de setlist ou par `song_key`).
  - **A bosser** : `rehearsal_tasks`, attribue a un membre (push) ou au groupe, a cocher par tout membre, repris sur la page du groupe avec le journal et les chiffres (`getBandRehearsalJournal`).
  - **Feed** : activite `rehearsal_logged` a la confirmation si « Partager » est coche, sans notes ni verdicts et sans push aux amis ; une carte par ami, chacune avec ses reactions et commentaires. Badge `repete` (1 / 10 / 50).
- **Prets pour la repete** (migration `20261124_setlist_member_readiness`, `src/lib/actions/setlist-member-readiness.ts`, panneau `setlist-member-readiness-panel.tsx`) : sur une setlist de groupe et une repete a venir, les morceaux en lignes et les musiciens en colonnes, avec le statut et le pourcentage de chacun sur le poste tenu dans le groupe. `songs` et `song_parts` ne se lisent qu'entre amis : tout passe par la RPC `get_setlist_member_readiness`, reservee aux membres et limitee aux morceaux de la setlist. Le morceau d'un membre se retrouve par la ligne de setlist, puis `deezer_id`, puis `song_match_key` (titre + artiste). Chacun change sa colonne (`setMySetlistSongStatus`), ce qui ajoute le morceau a sa biblio s'il manque ; en groupe en lecture seule, on regarde seulement.
- **Repertoire du groupe** (migration `20261128_band_repertoire`, `src/lib/actions/band-songs.ts`, `src/lib/band-songs.ts`, composants `src/components/repertoire/`, pages `/commu/groupes/[bandId]/repertoire` et `/repertoire/[songId]`) : une fiche par morceau et par groupe (`band_songs`, unique par `song_match_key`) avec tonalite (`key_note` 0-11 + `key_mode`), tempo, accordage, capo, structure (meme forme que `played_sections`), notes du groupe, lien de tab et version de reference ; une note par musicien sur son poste (`band_song_notes`, chacun la sienne). Un morceau ajoute a une setlist du groupe entre tout seul dans le repertoire (trigger `link_setlist_item_to_band_song`, `setlist_items.band_song_id`), comme un morceau joue dans un compte rendu de repete (`save_rehearsal_log`, seulement ceux qui n'y etaient pas encore, pour qu'une fiche supprimee ne revienne pas ; migration `20261129_rehearsal_songs_repertoire`) ; on peut aussi en ajouter a la main. Le compte rendu propose le repertoire avant le catalogue. La fiche donne les valeurs par defaut : une ligne de setlist les surcharge (`withBandSongDefaults` : tempo, sections, lien de tab), y compris dans la jam, qui montre aussi la tonalite et ma note (`JamSongSheet`). Tout membre d'un groupe actif modifie (RLS), avec « Modifiee par X » et refus si la fiche a change depuis l'ouverture du formulaire ; lecture seule en groupe inactif. La fiche montre le dernier verdict de repete et l'etat de chacun sur son poste (RPC `get_band_song_readiness`). Pas de push.
- **Demos et enregistrements** (migration `20261130_band_recordings`, `src/lib/actions/band-recordings.ts`, `src/lib/band-recordings.ts`, composants `src/components/recordings/`, pages `/commu/groupes/[bandId]/enregistrements` et `/[recordingId]`) : audio ou video du groupe (`band_recordings` : titre, type demo / repete / concert / autre, note), relie au besoin a une fiche du repertoire et/ou a une repete (sections sur la page du groupe, la fiche et la repete passee). Bucket prive `band-recordings`, chemin `<groupe>/<auteur>/<fichier>`, 500 Mo par fichier (envoi Tus, video compressee comme les covers, ou prise au micro : `useLongRecorder`, 3 h au plus, ecran allume), liens signes 6 h (`signBandRecordingMedia`, lecture + telechargement), fichiers effaces par le service role apres la ligne (et le dossier avec le groupe, `deleteBand`). 20 Go par groupe quel que soit le plan de qui envoie, lus dans `storage.objects` (`band_recording_storage_used`, policy d'envoi + trigger). Commentaires `band_recording_comments` a un moment (`start_seconds`) ou sur un passage (`end_seconds`), reponses sur un niveau (sans moment) ; reperes sur la barre de lecture. Tout membre ecoute (meme en lecture seule) ; membre d'un groupe actif : ajoute, commente ; l'auteur modifie le sien, le supprime meme en lecture seule ; titulaire et admins suppriment tout dans un groupe actif. Push : `band_recording` (membres), `band_recording_comment` (auteur de l'enregistrement), `band_recording_reply` (auteur du commentaire), un seul par personne.
- **Concerts et page publique** (migration `20261201_band_public_pages`, `src/lib/concerts.ts`, `src/lib/actions/band-public.ts`, composants `src/components/concerts/`, page publique `src/app/groupe/[slug]`) : un concert est une setlist de groupe datee (`concert_date`), avec `concert_time`, `city`, `ticket_url` (http(s) seulement). Section Concerts sur la page du groupe (« Ajouter un concert » = `CreateSetlistModal` en mode `concert`), export `/api/setlists/[id]/ics` (heure de Paris), push `band_concert` quand une date a venir est posee (a la place de l'annonce de creation de setlist ; respecte la coupure des notifications de setlists), rappel `band_concert_reminder` la veille a tous les membres (cron `rehearsal-reminders`). Page publique `/groupe/<slug>` sans compte, referencee (sitemap, JSON-LD MusicGroup + MusicEvent) : presentation, line-up (pseudo et poste de chacun, lien vers le profil s'il est public), concerts a venir et passes avec les titres joues ; jamais la fiche technique ni les notes. Lue par la RPC `get_public_band` (rien si masquee ou groupe en lecture seule), sitemap par `list_public_bands`. `bands.slug` (genere depuis le nom, unique) et `bands.public_page` (vrai par defaut, groupes existants compris) ne changent que par la RPC `set_band_public_page` (titulaire et admins d'un groupe actif) ; l'ancienne adresse ne redirige pas. Bandeau « Ton groupe a maintenant une page publique » une fois par personne (localStorage).
- **Sondage de dates** (migration `20261125_rehearsal_polls`, `src/lib/actions/rehearsal-polls.ts`, `create-rehearsal-poll-modal.tsx`, `rehearsal-polls-section.tsx`) : « Proposer des dates » sur la page du groupe, 2 a 8 creneaux (date, debut, fin), chacun repond oui / si besoin / non. Tables `rehearsal_polls`, `rehearsal_poll_options` (figees apres creation), `rehearsal_poll_votes` (chacun les siennes, tant que le sondage est ouvert). Tout membre d'un groupe actif cree et repond ; l'auteur, le titulaire et les admins valident ou suppriment. Valider (RPC `close_rehearsal_poll`, sans SECURITY DEFINER) cree la repete a ce creneau avec titre, lieu et setlist du sondage, et les reponses deviennent les RSVP (oui = accepted, si besoin = maybe, non = declined, sans reponse = invited). Push `rehearsal_poll` a la creation, `rehearsal_created` a la validation, et une seule relance `rehearsal_poll_reminder` 48 h apres aux membres sans reponse (cron `rehearsal-reminders`, `reminded_at`).

### Challenges (`/challenges`)
- **3 onglets** : Actifs / Invitations / Leaderboard
- 3 types de defis :
  - `practice_time` : temps de pratique sur une periode
  - `streak` : plus longue serie sur la duree du defi (regle de `src/lib/streak.ts`)
  - `song_mastery` : maitriser un morceau specifique
- Duree configurable en jours
- Suivi automatique de la progression : temps et serie recalcules depuis les sessions jouees pendant le defi (`measureChallenge`, `src/lib/challenge-progress.ts`) a chaque ajout, correction ou suppression de session
- Leaderboard hebdomadaire/mensuel (via RPC `get_practice_leaderboard`)

### Amis (`/friends`)
- **2 onglets** : Amis / Demandes en attente
- Recherche d'utilisateurs
- Envoi/acceptation/rejet de demandes
- Blocage d'utilisateurs
- Consultation du profil public d'un ami (stats, morceaux, covers)
- Limite : 5 pour Free, illimite Pro/Band

### Feed (`/feed`)
- Activites des amis en temps reel
- Types d'activites : song_added, song_mastered, cover_posted, friend_added, song_wishlisted, setlist_created, band_created, band_joined, challenge_created/accepted/completed/won, album_reviewed, exercise_shared
- **Reactions** : systeme d'emoji sur les activites
- **Commentaires** : fil de discussion sur chaque activite (1-500 caracteres)

### Jam Sessions (`/jam/[id]`)
- Sessions collaboratives en temps reel (ouvertes a tout le groupe si son titulaire a le plan Band)
- **Host controls** : demarrer/pause/terminer, changer de morceau, sync metronome
- **Metronome synchronise** : tous les appareils se calent sur l'horloge du serveur (`useSharedClock`, `/api/time`) et un meme instant de depart (`start_at`), redit par l'hote toutes les 5 s pour les retardataires et la derive (`alignTo`, `src/lib/metronome-sync.ts`). Si le navigateur retient le son, bouton « Activer le son »
- **Decompte** : l'hote choisit aucun, 1 ou 2 mesures (1 par defaut, `JAM_COUNT_IN_OPTIONS`). Les premiers temps de la grille sont le decompte (`count_in_beats` dans `metronome_sync`), avec un autre son et 4, 3, 2, 1 a la place du tempo (`metronome.countIn`). Le morceau commence apres lui (`song_start_at`) ; un tempo change en jouant repart sans decompte et garde ce debut
- **File de morceaux** : setlist associee avec navigation. Changer de morceau (file ou bouton « Morceau suivant » de l'hote) arrete le metronome et prend le tempo de la ligne de setlist (`bpm`) ; l'hote relance avec le decompte
- **Viewer de tabs** : sections calees sur l'horloge commune depuis `song_start_at` (`sectionAt`), les memes chez tout le monde ; toucher une section passe en manuel. « Voir la tab » ouvre Songsterr sur la piste de son poste (`getJamTrackHint` renvoie l'index, `songsterrTrackUrl` ajoute `t<index>`)
- **Chat en direct** : messages dans la session (jam de groupe, plan Band), panneau `ChatSheet` avec compteur de non-lus sur telephone, efface a la fin de la jam par trigger (migration `20261116_group_chat`). Dans un groupe en lecture seule, la page de la jam explique pourquoi elle reste fermee
- **Depuis Jouer** : une setlist de groupe propose de lancer ou rejoindre la jam (`BandJamCallout`), a cote du chrono solo
- **Presence** : tracking des participants connectes via Supabase Presence
- **Hote** : seul l'hote pilote et termine la jam (action + RLS, migration `20261118_jam_host_only`)
- **Jam oubliee** : sans changement depuis 12 h (`JAM_SESSION_TTL_MS`), elle ne compte plus comme en cours, une nouvelle jam la ferme, et le cron `practice-reminders` ferme les autres
- **Ecran** : reste allume pendant la jam (`useWakeLock`)
- **Session guidee** : le nom affiche d'une jam sans groupe (setlist perso), ouverte a tous les plans

### Audio (`/audio`)
- **Identification de morceaux** : enregistrement micro → API AudD.io → resultat avec infos du catalogue
- **Accordeur guitare / basse** : detection de pitch en temps reel (autocorrelation ; FFT 4096 a partir de 50 Hz pour la guitare, 8192 a partir de 28 Hz pour la basse)
- Accordeur gratuit ; identification de morceaux Pro/Band

### Profil (`/profile/edit`)
- **4 onglets** : Profil / Favoris / Confidentialite / Integrations / Abonnement
- Display name, bio, avatar (upload)
- Liens sociaux : Instagram, TikTok, Twitter, Facebook
- Morceaux favoris (4 max) et albums favoris (4 max)
- Profil public/prive
- Statut abonnement

### Pricing (`/pricing`)
- 3 plans : Free, Pro (9EUR/mois ou 86EUR/an), Band a 5 personnes (24EUR/mois ou 230EUR/an ; les abonnes a 19 ou 182EUR gardent leur tarif et ont aussi leurs places)
- Toggle mensuel/annuel
- Checkout Stripe
- FAQ

### Abonnement (`/account/subscription`)
- Statut actuel
- **Places du plan Band** (migrations `20261117_band_plan_seats` et `20261119_band_access`, `src/lib/actions/band-seats.ts`) : le titulaire offre 4 places (comme un abonnement famille) a ses amis ou aux membres de ses groupes, l'invite accepte (Free ou Pro, une seule place a la fois). Un abonne Pro qui accepte n'est plus renouvele, et retrouve son Pro paye s'il perd la place avant la fin de sa periode (`src/lib/band-seat-billing.ts`) ; le webhook n'ecrit pas le plan d'un compte sur une place. `profiles.plan` reste la seule source des droits : des triggers le mettent a `band` quand la place est prise, a `free` quand elle est rendue ou quand le titulaire quitte le plan Band. Ne pas ecrire ce plan ailleurs pour un invite.
- **Webhook Stripe** (`/api/stripe/webhooks`) : seul moyen d'appliquer un paiement au plan, a brancher sur chaque compte Stripe (test puis live). L'achat interroge Stripe, pas la base, pour eviter un second abonnement.
- **Prix Stripe** : `STRIPE_PRICE_BAND_SHARED_*` pour les nouveaux abonnements ; `STRIPE_PRICE_BAND_MONTHLY/YEARLY` restent reconnus (anciens abonnes), ne pas les retirer.
- Portal Stripe pour gestion
- Upgrade/downgrade

---

## Modele de donnees (Supabase)

### Tables (32 tables)

```sql
-- Utilisateurs (extension de auth.users)
profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  plan user_plan DEFAULT 'free',        -- 'free' | 'pro' | 'band'
  bio text,
  instagram_url text,
  tiktok_url text,
  twitter_url text,
  facebook_url text,
  is_private boolean DEFAULT false,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  subscription_status text,
  created_at timestamptz,
  updated_at timestamptz
)

-- Morceaux dans la bibliotheque
songs (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles,
  title text NOT NULL,
  artist text,
  album text,
  cover_url text,
  spotify_id text,
  preview_url text,
  difficulty song_difficulty,           -- 'beginner' | 'intermediate' | 'advanced' | 'expert'
  status song_status DEFAULT 'want_to_learn', -- 'want_to_learn' | 'learning' | 'mastered'
  progress_percent integer DEFAULT 0,
  tuning text DEFAULT 'standard',
  capo_position integer DEFAULT 0,
  tabs_url text,
  notes text,
  target_bpm integer,
  spotify_bpm integer,
  spotify_key integer,
  spotify_energy real,
  spotify_audio_fetched_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)

-- Wishlist
wishlist_songs (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles,
  title text, artist text, album text,
  cover_url text, spotify_id text, preview_url text,
  created_at timestamptz,
  UNIQUE(user_id, spotify_id)
)

-- Morceaux favoris (profil)
favorite_songs (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles,
  song_id uuid REFERENCES songs,
  position integer,                     -- 1-4
  created_at timestamptz,
  UNIQUE(user_id, position)
)

-- Albums favoris (profil)
favorite_albums (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles,
  album_name text, artist_name text, cover_url text, spotify_id text,
  position integer,                     -- 1-4
  created_at timestamptz,
  UNIQUE(user_id, position)
)

-- Covers
covers (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles,
  song_id uuid REFERENCES songs,
  media_url text NOT NULL,
  media_type cover_media_type,          -- 'video' | 'audio'
  thumbnail_url text,
  duration_seconds integer,
  file_size_bytes bigint,
  visibility cover_visibility DEFAULT 'private', -- 'private' | 'friends' | 'public'
  description text,
  created_at timestamptz
)

-- Sessions de pratique
practice_sessions (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles,
  song_id uuid REFERENCES songs,
  duration_minutes integer,
  practiced_at timestamptz,
  bpm_achieved integer,
  mood session_mood,                    -- 'frustrated' | 'neutral' | 'good' | 'great' | 'on_fire'
  energy_level energy_level,            -- 'low' | 'medium' | 'high'
  sections_worked song_section[],       -- array de sections
  session_goals text,
  goals_achieved boolean,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)

-- Exercices
exercises (
  id uuid PRIMARY KEY,
  name text, description text,
  category exercise_category,           -- 'scales' | 'arpeggios' | 'picking' | 'chord_changes' | 'fingerstyle' | 'technique' | 'rhythm'
  difficulty exercise_difficulty,
  starting_bpm integer, target_bpm integer, bpm_increment integer,
  time_signature text,
  instructions text[], tips text[],
  video_url text,
  duration_minutes integer,
  is_system boolean,
  shared_with_friends boolean,
  created_by uuid REFERENCES profiles,
  created_at timestamptz, updated_at timestamptz
)

-- Progression exercices par utilisateur
user_exercises (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles,
  exercise_id uuid REFERENCES exercises,
  current_bpm integer, best_bpm integer,
  total_practice_minutes integer, sessions_count integer,
  last_practiced_at timestamptz,
  created_at timestamptz, updated_at timestamptz,
  UNIQUE(user_id, exercise_id)
)

-- Exercices dans une session de pratique
practice_session_exercises (
  id uuid PRIMARY KEY,
  practice_session_id uuid REFERENCES practice_sessions,
  exercise_id uuid REFERENCES exercises,
  duration_minutes integer, bpm_achieved integer,
  created_at timestamptz
)

-- Relations amis
friendships (
  id uuid PRIMARY KEY,
  requester_id uuid REFERENCES profiles,
  addressee_id uuid REFERENCES profiles,
  status friendship_status DEFAULT 'pending', -- 'pending' | 'accepted' | 'blocked'
  created_at timestamptz, updated_at timestamptz,
  UNIQUE(requester_id, addressee_id)
)

-- Feed d'activite
activities (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles,
  type activity_type,                   -- 14 types (voir section enums)
  reference_id uuid,
  metadata jsonb,
  created_at timestamptz
)

-- Reactions sur activites
activity_reactions (
  id uuid PRIMARY KEY,
  activity_id uuid REFERENCES activities,
  user_id uuid REFERENCES profiles,
  emoji text,
  created_at timestamptz,
  UNIQUE(activity_id, user_id, emoji)
)

-- Commentaires sur activites
activity_comments (
  id uuid PRIMARY KEY,
  activity_id uuid REFERENCES activities,
  user_id uuid REFERENCES profiles,
  content text,                         -- 1-500 caracteres
  created_at timestamptz
)

-- Playlists
playlists (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles,
  name text, description text, cover_url text,
  created_at timestamptz, updated_at timestamptz
)

-- Morceaux dans playlists
playlist_songs (
  id uuid PRIMARY KEY,
  playlist_id uuid REFERENCES playlists,
  song_id uuid REFERENCES songs,
  position integer,
  added_at timestamptz,
  UNIQUE(playlist_id, song_id)
)

-- Groupes
bands (
  id uuid PRIMARY KEY,
  owner_id uuid REFERENCES profiles,
  name text, description text, cover_url text,
  created_at timestamptz, updated_at timestamptz
)

-- Membres de groupe
band_members (
  id uuid PRIMARY KEY,
  band_id uuid REFERENCES bands,
  user_id uuid REFERENCES profiles,
  role band_member_role,                -- 'owner' | 'admin' | 'member'
  joined_at timestamptz,
  UNIQUE(band_id, user_id)
)

-- Invitations de groupe
band_invitations (
  id uuid PRIMARY KEY,
  band_id uuid REFERENCES bands,
  inviter_id uuid REFERENCES profiles,
  invitee_id uuid REFERENCES profiles,
  status band_invitation_status,        -- 'pending' | 'accepted' | 'declined'
  created_at timestamptz, updated_at timestamptz
)

-- Setlists
setlists (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles,
  band_id uuid REFERENCES bands,       -- nullable (personnel si null)
  name text, description text, venue text,
  concert_date date,
  is_personal boolean,
  created_at timestamptz, updated_at timestamptz
)

-- Items de setlist
setlist_items (
  id uuid PRIMARY KEY,
  setlist_id uuid REFERENCES setlists,
  position integer,
  item_type setlist_item_type,          -- 'song' | 'section'
  song_id uuid REFERENCES songs,
  song_owner_id uuid,                   -- pour morceaux d'autres membres du groupe
  song_title text, song_artist text, song_cover_url text,
  section_name text,
  notes text,
  transition_seconds integer, duration_seconds integer,
  tabs_url text,
  bpm integer,
  played_sections jsonb,                -- [{name, startMeasure, endMeasure}]
  created_at timestamptz, updated_at timestamptz
)

-- Challenges
challenges (
  id uuid PRIMARY KEY,
  creator_id uuid REFERENCES profiles,
  challenger_id uuid REFERENCES profiles,
  winner_id uuid REFERENCES profiles,
  song_id uuid REFERENCES songs,
  challenge_type challenge_type,        -- 'practice_time' | 'streak' | 'song_mastery'
  status challenge_status,              -- 'pending' | 'active' | 'completed' | 'cancelled' | 'declined'
  duration_days integer,
  starts_at timestamptz, ends_at timestamptz,
  song_title text, song_artist text, song_cover_url text,
  created_at timestamptz, updated_at timestamptz
)

-- Progression des challenges
challenge_progress (
  id uuid PRIMARY KEY,
  challenge_id uuid REFERENCES challenges,
  user_id uuid REFERENCES profiles,
  practice_minutes integer,
  streak_days integer,
  streak_last_date date,
  song_mastered_at timestamptz,
  created_at timestamptz, updated_at timestamptz,
  UNIQUE(challenge_id, user_id)
)

-- Sessions jam
jam_sessions (
  id uuid PRIMARY KEY,
  host_id uuid REFERENCES profiles,
  band_id uuid REFERENCES bands,
  setlist_id uuid REFERENCES setlists,
  status jam_session_status,            -- 'waiting' | 'active' | 'paused' | 'ended'
  bpm integer,
  time_signature_beats integer,
  time_signature_value integer,
  is_metronome_playing boolean,
  current_song_index integer,
  current_song_id uuid,
  current_song_title text, current_song_artist text,
  started_at timestamptz, ended_at timestamptz,
  created_at timestamptz, updated_at timestamptz
)

-- Participants jam
jam_session_participants (
  id uuid PRIMARY KEY,
  session_id uuid REFERENCES jam_sessions,
  user_id uuid REFERENCES profiles,
  joined_at timestamptz,
  left_at timestamptz,
  is_active boolean,
  UNIQUE(session_id, user_id)
)

-- Messages jam
jam_session_messages (
  id uuid PRIMARY KEY,
  session_id uuid REFERENCES jam_sessions,
  user_id uuid REFERENCES profiles,
  content text,
  created_at timestamptz
)

-- Repetitions
rehearsals (
  id uuid PRIMARY KEY,
  band_id uuid REFERENCES bands,
  created_by uuid REFERENCES profiles,
  setlist_id uuid REFERENCES setlists,
  title text, description text,
  location text, location_url text,
  date timestamptz, end_date timestamptz,
  status rehearsal_status,              -- 'scheduled' | 'cancelled' | 'completed'
  recurrence recurrence_type,           -- 'none' | 'weekly' | 'biweekly' | 'monthly'
  recurrence_day_of_week integer,
  recurrence_end_date date,
  parent_rehearsal_id uuid,
  notes text,
  created_at timestamptz, updated_at timestamptz
)

-- Participants repetitions
rehearsal_participants (
  id uuid PRIMARY KEY,
  rehearsal_id uuid REFERENCES rehearsals,
  user_id uuid REFERENCES profiles,
  status rehearsal_rsvp_status,         -- 'invited' | 'accepted' | 'declined' | 'maybe'
  responded_at timestamptz,
  UNIQUE(rehearsal_id, user_id)
)

-- Messages de groupe
band_messages (
  id uuid PRIMARY KEY,
  band_id uuid REFERENCES bands,
  rehearsal_id uuid REFERENCES rehearsals, -- nullable (general si null)
  user_id uuid REFERENCES profiles,
  content text,
  created_at timestamptz
)

-- Reviews d'albums
album_reviews (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles,
  album_name text, artist_name text, cover_url text,
  spotify_id text, spotify_url text, release_date text,
  total_tracks integer,
  rating integer,                       -- 1-10
  review text,                          -- max 2000 caracteres
  created_at timestamptz, updated_at timestamptz
)

-- Abonnements push
push_subscriptions (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles,
  endpoint text UNIQUE,
  keys jsonb,
  user_agent text,
  created_at timestamptz, updated_at timestamptz
)

-- Logs notifications
notification_logs (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles,
  type text, title text, body text,
  data jsonb,
  sent_at timestamptz,
  success boolean
)
```

### Tables et colonnes ajoutees pour le multi-instrument

```sql
-- Instruments du musicien (un seul principal, index unique partiel)
profile_instruments (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles,
  instrument instrument,                -- 'guitar' | 'bass' | 'drums' | 'keys' | 'other'
  level skill_level,                    -- 'beginner' | 'intermediate' | 'advanced' | 'expert'
  is_primary boolean,
  custom_label text,                    -- seulement pour 'other'
  created_at timestamptz,
  UNIQUE(user_id, instrument)
)

-- Statut et progression d'un morceau par instrument (songs.status / progress_percent en sont la synthese)
song_parts (
  id uuid PRIMARY KEY,
  song_id uuid REFERENCES songs ON DELETE CASCADE,
  user_id uuid REFERENCES profiles,
  instrument instrument,
  status song_status,
  progress_percent integer,
  created_at timestamptz, updated_at timestamptz,
  UNIQUE(song_id, instrument)
)

practice_sessions.instrument instrument        -- instrument joue
exercises.instruments instrument[]             -- vide = tous les instruments
band_members.instrument instrument             -- poste dans le groupe
band_members.instrument_label text             -- precise 'other' (chant, saxo…)
waitlist.instruments instrument[]              -- « Tu joues de quoi ? » de la liste d'attente
```

### Donnees privees du profil

`profiles` est lisible par tous (y compris sans compte) : il ne garde que ce qui
peut etre montre. L'abonnement, la langue et les reglages vivent dans
`profile_private` (migration `20261104_profile_private`, lisible par soi seul,
abonnement ecrit par le service role). Le profil d'un autre se lit avec
`PUBLIC_PROFILE_COLUMNS` (`src/lib/public-profile.ts`), jamais en `select("*")` ;
son propre profil avec `getMyProfile` (joint `PROFILE_PRIVATE_SELECT`, champs
remis a plat). Les colonnes privees ont quitte `profiles` (`20261105_profile_private_drop`) ; cf. `docs/profils-prives.md`.

```sql
profile_private (
  user_id uuid PRIMARY KEY REFERENCES profiles ON DELETE CASCADE,
  stripe_customer_id text UNIQUE, stripe_subscription_id text, stripe_price_id text,
  subscription_status text, subscription_period_end timestamptz,
  locale text,                  -- 'fr' | 'en' : push, emails, crons
  practice_reminders boolean,   -- rappels de pratique
  share_sessions boolean,       -- partager ses sessions avec ses amis (defaut de la case en fin de session)
  badges_synced_at timestamptz
)
```

### Matos : detail prive, et vitrine des profils publics

`gear_items` est lisible par les amis (matos « Amis ») et par tous (« Public ») :
il ne garde que ce qui peut etre montre (`PUBLIC_GEAR_COLUMNS`,
`src/lib/gear-columns.ts`). Numero de serie, etat, prix, date d'achat et notes
vivent dans `gear_item_private` (lisible par soi seul, migrations
`20261109_gear_private` puis `20261110_gear_private_drop`). Son propre matos se lit
avec `OWN_GEAR_SELECT` + `withGearDetails`, s'ecrit avec `splitGearInput` ; le
matos d'un autre jamais en `select("*")`.

`profiles.is_private` (prive par defaut, le choix reste a l'inscription et dans
Confidentialite) : un profil public montre aux non-amis sa **vitrine** (bio,
liens, favoris, badges, matos et covers « Public », chiffres de pratique,
sujets du forum) ; la biblio, les albums notes, la wishlist, les playlists et
les sessions restent entre amis (`getPublicProfile` : `canViewLibrary`). Les
morceaux favoris passent par la RPC `get_profile_favorite_songs` (titre,
artiste, pochette seulement).

« Public » (cover ou matos) va aussi loin que le profil : tout le monde sur un
profil public, les amis seulement sur un profil prive (RLS, et
`effectiveVisibility` dans `src/lib/visibility.ts` pour l'affichage). La valeur
stockee ne change pas quand le profil change. Une nouvelle cover est « Public »
par defaut ; sur un profil public, la case « Reservee a mes amis » la passe en
« Amis » (`CoverVisibilityField`). « Moi seul » n'est plus propose pour les
covers (les anciennes le restent). `useMyProfileIsPrivate()` :
`ProfilePrivacyProvider`, monte dans `(main)/layout.tsx`.

La wishlist matos (`gear_wishlist.visibility`, migration
`20261111_gear_wishlist_visibility`) suit la meme regle : « Public » par defaut,
case « Reservee a mes amis » (`AudienceField`, `src/components/ui/audience-field.tsx`),
basculable sur la carte (`updateGearWishlistVisibility`). Une envie ajoutee cree
l'activite `gear_wishlisted` (retiree avec l'envie) ; elle s'affiche dans l'onglet
Matos du profil (« Ses envies »).

### Colonnes ajoutees pour les langues

```sql
profile_private.locale text                    -- 'fr' | 'en', langue des push, emails et crons (migration 20261028_locale, deplacee par 20261104)
waitlist.locale text                           -- langue de la page d'inscription, celle de l'email de confirmation
exercises.translations jsonb                   -- { "en": { name, description, instructions[], tips[] } } (migration 20261029_exercise_translations)
```

### RPC Functions (Stored Procedures)

```sql
-- Instruments
set_my_instruments(p_instruments JSONB)        -- remplace la liste d'un bloc, exactement un principal
primary_instrument(p_user UUID) → instrument   -- guitare a defaut
set_band_member_instrument(p_band_id UUID, p_user_id UUID, p_instrument instrument, p_label TEXT)

-- Gestion des positions dans les setlists
shift_setlist_items(p_setlist_id UUID, p_from_position INTEGER, p_shift_amount INTEGER)
reorder_setlist_items(p_setlist_id UUID)
move_setlist_item(p_setlist_id UUID, p_item_id UUID, p_old_position INTEGER, p_new_position INTEGER)

-- Profil : date et duree des sessions (chiffres de pratique d'un ami ou d'un profil public ; le detail vient des activites session_completed)
get_profile_practice_days(p_user_id UUID) → RETURNS TABLE (practiced_at, duration_minutes, session_key)

-- Leaderboard
get_practice_leaderboard(p_user_id UUID, p_period TEXT, p_limit INTEGER DEFAULT 10)
  → RETURNS TABLE (user_id, username, display_name, avatar_url, total_minutes, sessions_count, rank)
```

### Enums PostgreSQL

| Enum | Valeurs |
|------|---------|
| user_plan | free, pro, band |
| song_status | want_to_learn, learning, mastered |
| song_difficulty | beginner, intermediate, advanced, expert |
| cover_visibility | private, friends, public |
| cover_media_type | video, audio |
| session_mood | frustrated, neutral, good, great, on_fire |
| energy_level | low, medium, high |
| song_section | intro, verse, chorus, bridge, solo, outro, full_song |
| exercise_category | scales, arpeggios, picking, chord_changes, fingerstyle, technique, rhythm, rudiments, grooves, fills, independence, slap, walking_bass, voicings, reading |
| instrument | guitar, bass, drums, keys, other |
| skill_level | beginner, intermediate, advanced, expert |
| gear_type | guitar, bass, amp, effect, drums, cymbals, keyboard, accessory, recording, other |
| exercise_difficulty | beginner, intermediate, advanced, expert |
| friendship_status | pending, accepted, blocked |
| activity_type | song_added, song_learning, song_mastered, cover_posted, friend_added, song_wishlisted, setlist_created, band_created, band_joined, challenge_created, challenge_accepted, challenge_completed, challenge_won, album_reviewed, album_wishlisted, exercise_shared, gear_added, gear_wishlisted, badge_unlocked, session_completed, rehearsal_logged |
| band_member_role | owner, admin, member |
| band_invitation_status | pending, accepted, declined |
| challenge_type | practice_time, streak, song_mastery |
| challenge_status | pending, active, completed, cancelled, declined |
| jam_session_status | waiting, active, paused, ended |
| setlist_item_type | song, section |
| rehearsal_status | scheduled, cancelled, completed |
| rehearsal_rsvp_status | invited, accepted, declined, maybe |
| recurrence_type | none, weekly, biweekly, monthly |

### Storage Buckets

| Bucket | Type | Contenu |
|--------|------|---------|
| covers | Prive (liens signes 6 h, `signCoverMedia` dans `src/lib/storage/cover-media.ts`) | Video/audio covers (mp4, webm, quicktime, mpeg, wav, webm audio) - 200MB max |
| avatars | Public | Images de profil |

---

## Server Actions (src/lib/actions/)

| Fichier | Fonctions principales |
|---------|----------------------|
| `auth.ts` | signUp, logIn, logOut, getCurrentUser |
| `songs.ts` | getSongs, getSong, createSong (limite 10 free), updateSong, deleteSong, updateSongStatus, updateSongProgress |
| `practice.ts` | getPracticeSessions, createPracticeSession, updatePracticeSession, deletePracticeSession, getPracticeStats, getHeatmapData, getBpmProgressData, getMoodDistribution, getSongPracticeDistribution |
| `covers.ts` | getCovers, getCover, createCover (limite 3 free), updateCover, deleteCover |
| `friends.ts` | getFriends, getFriendProfile, searchUsers, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend, blockUser, unblockUser (limite 5 free) |
| `activities.ts` | createActivity, getActivities, getActivityWithDetails, addActivityReaction, removeActivityReaction, addActivityComment, deleteActivityComment |
| `challenges.ts` | createChallenge, getChallenges, getChallenge, respondToChallenge, updateChallengeProgress, completeSongMasteryChallenge, getLeaderboard |
| `bands.ts` | createBand, getBands, getBandWithMembers, updateBand, deleteBand, inviteUserToBand, respondToInvitation, changeMemberRole, removeMember |
| `setlists.ts` | createSetlist, getSetlists, getSetlist, updateSetlist, deleteSetlist, addSetlistItem, updateSetlistItem, removeSetlistItem |
| `jam-sessions.ts` | createJamSession, getJamSession, getJamSessions, joinJamSession, leaveJamSession, updateJamSessionStatus, updateJamMetronome, changeSongInJamSession |
| `rehearsals.ts` | createRehearsal, getRehearsals, getRehearsal, updateRehearsal, deleteRehearsal, respondToRehearsal (recurrence support) |
| `band-messages.ts` | sendBandMessage, deleteBandMessage |
| `exercises.ts` | createExercise, getExercises, getExerciseWithProgress, shareExerciseWithFriends, recordExerciseProgress, getUserExerciseProgress |
| `playlists.ts` | createPlaylist, getPlaylists, getPlaylist, updatePlaylist, deletePlaylist, addSongToPlaylist, removeSongFromPlaylist, reorderPlaylist |
| `albums.ts` | createAlbumReview, getAlbumReviews, updateAlbumReview, deleteAlbumReview, getFriendAlbumReviews |
| `wishlist.ts` | addToWishlist (limite 20 free), getWishlist, removeFromWishlist |
| `profile.ts` | getProfile, getPublicProfile, updateProfile, getProfileStats, setFavoriteSong (4 max), setFavoriteAlbum (4 max), uploadAvatar |
| `plan.ts` | requirePaidPlan |
| `instruments.ts` | getMyInstruments, getMyInstrumentLimit, setMyInstruments (onboarding + reglages ; limite 2 free, on garde les instruments deja la) |
| `bands.ts` (ajout) | setBandMemberInstrument (poste dans le groupe) |
| `jam-sessions.ts` (ajout) | getJamTrackHint (piste Songsterr pour son poste) |

---

## API Routes

| Route | Methode | Description | Auth |
|-------|---------|-------------|------|
| `/auth/callback` | GET | Callback OAuth Supabase, creation profil | - |
| `/api/catalog/search` | GET | Recherche morceaux / albums (Deezer) | Auth |
| `/api/tabs/search` | GET | Recherche tabs (Songsterr) | Pro/Band |
| `/api/tabs/structure` | GET | Structure d'un tab (GP file) | Pro/Band |
| `/api/audio/identify` | POST | Identification audio (AudD.io) | Pro/Band |
| `/api/push/subscribe` | POST/DELETE | Gestion abonnements push | Auth |
| `/api/stripe/checkout` | POST | Cree session Stripe Checkout | Auth |
| `/api/stripe/portal` | POST | Cree session Stripe Customer Portal | Auth |
| `/api/stripe/webhooks` | POST | Webhooks Stripe (subscription events) | Stripe signature |
| `/api/cron/rehearsal-reminders` | GET | Envoie rappels repetitions | Cron (Vercel) |
| `/api/rehearsals/[id]/ics` | GET | Genere fichier iCalendar | Auth |
| `/api/waitlist/unsubscribe` | POST | Desinscription en un clic (List-Unsubscribe) | Token |

---

## Services externes

| Service | Usage | Config |
|---------|-------|--------|
| **Supabase** | BDD PostgreSQL, Auth, Storage, Realtime | NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY |
| **Stripe** | Abonnements, paiements | NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, STRIPE_PRICE_PRO_MONTHLY/YEARLY, STRIPE_PRICE_BAND_MONTHLY/YEARLY |
| **Deezer** | Catalogue musical : recherche, pochettes, extraits, tempo (`src/lib/services/deezer.ts`) ; a remplace Spotify et Last.fm | API publique (pas de cle) |
| **Songsterr** | Recherche de tabs, tempo/sections (piste JSON du CDN), piste a choisir par instrument (`findSongsterrTrack`) | API publique (pas de cle) |
| **Wikidata / Wikipedia** | Fiche et article d'un album ou d'un artiste, line-up des groupes (`src/lib/services/wikipedia.ts`) : correspondance par l'ID Deezer (P2722 artiste, P2723 album), puis par le nom ; fr d'abord, en en secours ; textes sous CC BY-SA (attribution affichee) | API publiques (pas de cle), User-Agent obligatoire |
| **Resend** | Email de confirmation de la liste d'attente | RESEND_API_KEY, EMAIL_FROM |
| **AudD.io** | Identification audio | AUDD_API_TOKEN |
| **Web Push (VAPID)** | Notifications push PWA | NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT |

---

## Custom Hooks

| Hook | Fichier | Usage |
|------|---------|-------|
| `useMetronome` | `src/lib/hooks/use-metronome.ts` | Metronome Web Audio avec scheduler (lookahead 25ms), support tap tempo, accents, subdivisions, mode silence |
| `useJamSession` | `src/lib/hooks/use-jam-session.ts` | Realtime jam : presence, broadcast (metronome_sync, song_change, session_status), postgres_changes pour chat |
| `useAudioRecorder` | `src/lib/hooks/use-audio-recorder.ts` | Enregistrement micro (MediaRecorder API, webm/opus, max 8s par defaut) |
| `usePitchDetection` | `src/lib/hooks/use-pitch-detection.ts` | Detection de pitch par autocorrelation (`usePitchDetection(minFrequency)` : 50 Hz / FFT 4096 par defaut, `BASS_MIN_FREQUENCY` 28 Hz / FFT 8192 pour la basse ; A4=440Hz) |
| `useBandChat` | `src/lib/hooks/use-band-chat.ts` | Chat realtime groupe/repetition via postgres_changes |

---

## Notifications Push

### Types de notifications
friend_request, friend_accepted, friend_playing, rehearsal_logged, rehearsal_task, song_added, song_mastered, cover_posted, song_wishlisted, setlist_created, band_setlist_created, band_setlist_updated, band_setlist_deleted, band_created, band_joined, band_invitation, challenge_created, challenge_accepted, challenge_completed, challenge_won, jam_session_started, album_reviewed, activity_reaction, activity_comment, exercise_shared, rehearsal_created, rehearsal_reminder, rehearsal_cancelled, rehearsal_poll, rehearsal_poll_reminder, band_message, band_recording, band_recording_comment, band_recording_reply, band_concert, band_concert_reminder

### Infrastructure
- Service worker custom (`sw-push-handler.js`)
- Subscriptions stockees dans `push_subscriptions`
- Logs dans `notification_logs`
- Envoi via `web-push` (npm) avec VAPID
- Gestion automatique des subscriptions expirees (410 Gone → deletion)

---

## Variables d'environnement

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_PRO_YEARLY=
STRIPE_PRICE_BAND_MONTHLY=
STRIPE_PRICE_BAND_YEARLY=
STRIPE_PRICE_BAND_SHARED_MONTHLY=
STRIPE_PRICE_BAND_SHARED_YEARLY=
STRIPE_WEBHOOK_SECRET=

# Cron Vercel
CRON_SECRET=

# App
NEXT_PUBLIC_APP_URL=

# Web Push Notifications (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:contact@ostinara.app

# Audio Recognition (AudD.io)
AUDD_API_TOKEN=

# Emails transactionnels (Resend) — confirmation liste d'attente
RESEND_API_KEY=
EMAIL_FROM=                   # ex. "Ostinara <bonjour@mondomaine.fr>" (domaine verifie dans Resend)
```

---

## Limites par plan

| Fonctionnalite | Free | Pro (9EUR/mois) | Band (24EUR/mois) |
|----------------|------|-----------------|-------------------|
| Morceaux | 10 | illimite | illimite |
| Covers | 3 | 20 Go par personne | 20 Go par personne |
| Amis | 5 | illimite | illimite |
| Wishlist | 20 | illimite | illimite |
| Instruments | 2 | illimite | illimite |
| Matos (equipements / setups / envies) | 5 / 1 / 10 | illimite | illimite |
| Stats avancees | non | oui | oui |
| Lecteur Deezer & tablatures | non | oui | oui |
| Identification audio | non | 30 essais par jour | 30 essais par jour |
| Accordeur | oui | oui | oui |
| Recommandations d'albums | non | oui | oui |
| Groupes (bands) | non | non | oui |
| Creer un groupe | non | non | oui |
| Jam, repetitions, chat de groupe, fiche technique | sur invitation, si le titulaire du groupe a le plan Band | idem | oui |
| Badge profil | non | Pro | Band |
| Personnes sur le plan | 1 | 1 | 5 (titulaire + 4 places) |
| Prix annuel | - | 86EUR/an (-20%) | 230EUR/an (-20%) |

---

## Conventions de code

### General
- TypeScript strict mode active
- Composants fonctionnels avec hooks
- Nommage : PascalCase pour composants, camelCase pour fonctions/variables
- Fichiers : kebab-case (ex: `song-card.tsx`)
- Path alias : `@/*` → `./src/*`

### Structure des composants
```tsx
// Imports
import { ... } from 'react'
import { ... } from '@/lib/...'
import { ... } from '@/components/ui/...'

// Types
interface Props { ... }

// Composant
export function ComponentName({ ... }: Props) {
  // Hooks
  // Handlers
  // Render
}
```

### Supabase
- Client server-side dans les Server Components et Server Actions
- Client browser dans les Client Components
- Toujours typer les retours avec les types de `@/types`

### Gestion d'erreurs
- Toujours gerer les cas d'erreur Supabase
- Afficher des messages user-friendly
- Logger les erreurs cote serveur

---

## PWA

### Configuration (next.config.mjs)
- **Dev** : PWA desactivee
- **Production** : Service worker genere automatiquement
- **Caching strategies** :
  - Supabase API : NetworkFirst (cache 5 min)
  - Spotify Images : CacheFirst (expiry 30 jours)
  - Google Fonts : CacheFirst (expiry 1 an)
  - Static assets : StaleWhileRevalidate
  - Next.js images : StaleWhileRevalidate (30 jours)

### Navigation
5 onglets definis dans `src/lib/navigation.ts` (`NAV_TABS`), chacun avec ses segments :
- **Accueil** (`/accueil`)
- **Jouer** (`/jouer`) : metronome, morceau, setlists, exercices, sessions ; accordeur / reconnaissance en feuille
- **Biblio** (`/biblio`) : Morceaux, Albums, Covers
- **Commu** (`/commu`) : Feed, Covers, Albums, Amis, Defis, Groupes
- **Profil** (`/profil`) : Progression, Badges, Matos, Reglages

Desktop : `desktop-sidebar.tsx` ; mobile : `bottom-tab-bar.tsx` ; icones : `nav-icon.tsx`.
Hors layout principal : `/bienvenue` (choix des instruments, route group `(onboarding)`), `/acces-anticipe` (landing liste d'attente).

---

## Commandes utiles

```bash
# Developpement (Turbopack)
npm run dev

# Build (Webpack - Turbopack en dev seulement)
npm run build

# Linting
npm run lint

# Traductions : regenere messages/*/index.ts et verifie fr = en
npm run check:i18n

# Types Supabase (apres modification du schema)
npx supabase gen types typescript --project-id <id> > src/types/supabase.ts
```

---

## Cron Jobs (Vercel)

| Route | Schedule | Description |
|-------|----------|-------------|
| `/api/cron/rehearsal-reminders` | Tous les jours a 8h UTC | Envoie des notifications push de rappel pour les repetitions du jour |

---

## Notes de design

- **Palette** : Tons chauds (ambres/bois) evoquant les instruments acoustiques
- **UI** : Clean, moderne, mobile-first
- **Theme** : Light/Dark mode (next-themes)
- **Inspiration** : Spotify (navigation), Strava (progression), Instagram (feed social)
