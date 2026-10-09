# Refonte de l'interface — plan de travail

Ce fichier est la feuille de route de la refonte visuelle d'Ostinara. Il se
suffit à lui-même : une nouvelle session peut reprendre une phase en le
lisant, puis en lisant les fichiers listés dans cette phase.

- **Maquette cliquable (référence visuelle)** :
  https://claude.ai/artifact/MRzQuQH9pFmKRYpDg4NafA
- **Diagnostic et propositions** :
  https://claude.ai/artifact/SDWz9KMoUS9QfTR8SzAKbq
- **Inspiration principale** : https://www.reprised.app/

La maquette est une page HTML statique. Elle montre le rendu attendu, pas le
code à recopier : on reconstruit chaque écran avec les composants, les
Server Actions et les jetons Tailwind du projet.

---

## 1. Pourquoi

L'app « fait générée ». Ce qui produit cet effet, mesuré dans `src/` le
2026-10-08 :

| Constat | Mesure |
|---|---|
| Tout est une carte bordée | 120 fichiers avec `rounded-xl border` |
| Icônes Material Symbols, souvent dans une pastille | 221 usages |
| Ombres lourdes et dégradés décoratifs | 74 `shadow-lg/xl`, 16 `bg-gradient` |
| Navigation empilée | Biblio : 5 niveaux avant le premier morceau |
| Ambre en aplat partout | Jouer : 4 gros blocs ambre sur le premier écran |
| Pochettes noires sur fond noir | Black Album, Meteora, Mutter… disparaissent |
| Bandeau « Activer les notifications » | posé sur le contenu, sur toutes les pages |

Ce qui marche déjà et sert de modèle : **Biblio › Albums** (grandes pochettes,
notes) et la **vitrine du Profil**.

---

## 2. Décisions

Validées avec l'utilisateur le 2026-10-09.

| Sujet | Décision |
|---|---|
| Palette | **Inchangée.** Les valeurs de `globals.css` ne bougent pas. On corrige l'usage des couleurs, jamais leurs valeurs. |
| Thème | **Clair par défaut**, sombre et système en option. |
| Barre du bas (mobile) | **Pilule flottante** partout, icônes seules, état actif en pastille neutre. |
| Icônes | **Lucide** (`lucide-react`) à la place de Material Symbols, écran par écran pendant chaque phase. |
| Ordinateur | Adapté **pendant chaque phase**, pas de maquette séparée. |
| Polices | Plus Jakarta Sans pour le texte, **Barlow Condensed** pour les titres et les chiffres, **Bitter** (serif) pour les avis et les notes personnelles. |

### Un style par domaine

| Domaine | Style | Idée |
|---|---|---|
| Biblio (morceaux, albums, covers), Recherche, fiche morceau | **A · Étagère** | Les pochettes font le travail. Étagères horizontales, contrôle segmenté, une seule carte par écran. |
| Jouer (carnet, session, métronome, exercices, accordeur) | **B · Atelier** | Outil d'instrument façon Strava. Lignes à filets, chiffres en condensé, progression en 12 « frettes ». |
| Commu (feed, covers, albums de la semaine, amis, défis, groupes) | **C · Fanzine** | Pochettes plein cadre, titres en capitales condensées posés sur l'image, avis en serif. |
| Profil | **C + B** | Identité et bannière en Fanzine, chiffres et journal en Atelier. |

### Règles transverses

1. **Un seul niveau de sous-navigation.** Sur ordi, la sidebar ne montre que
   les 4 onglets ; les sections passent dans le contrôle de l'en-tête.
2. **Un seul aplat ambre par écran** : l'action principale. Les autres
   actions passent en contour ou en texte. L'ambre reste réservé à
   l'interactif et au tempo (cf. commentaire en tête de `globals.css`).
3. **Une seule carte par écran.** Les listes reposent sur le fond, séparées
   par des filets (`border-b border-border`).
4. **Pochettes** : toujours via le composant `Cover`, qui pose un liseré de
   1 px pour que les pochettes sombres restent visibles. Les morceaux d'un
   même album sont regroupés sur les étagères (« ×3 »).
5. **Pas de pastille autour des icônes**, pas de `shadow-lg/xl`, pas de
   dégradé décoratif, pas d'animation qui flotte ou qui brille.
6. **Chiffres** (BPM, durées, notes) en `font-display tabular`.

---

## 3. Phases

Chaque phase se termine par : `npm run lint`, `npx tsc --noEmit`, puis une
vérification à l'œil sur `https://localhost:3000` (`npm run dev`) en mobile
(~400 px) et en ordi, en thème clair et sombre.

### Phase 1 — Socle ✅ (faite le 2026-10-09)

Ce qui sert à toutes les autres phases.

- `src/app/layout.tsx` : charger Barlow Condensed et Bitter via `next/font`.
- `src/app/globals.css` : jetons `--font-display` et `--font-serif`.
- `src/components/providers/theme-provider.tsx` : `defaultTheme="light"`.
- `src/components/layout/theme-toggle.tsx` : suit le nouveau défaut.
- `lucide-react` installé ; `src/components/layout/nav-icon.tsx` passe sur Lucide.
- `src/components/layout/bottom-tab-bar.tsx` : pilule flottante.
- `src/components/layout/desktop-sidebar.tsx` : plus de sous-menu, état actif neutre.
- `src/components/layout/segmented-nav.tsx` : trois variantes —
  `segmented` (A), `underline` (B), `pills` (C).
- `src/components/ui/cover.tsx` : pochette avec liseré et repli.
- `src/components/ui/frets.tsx` : progression en 12 frettes (B).
- Notifications : la logique passe dans un hook
  (`src/lib/hooks/use-push-notifications.ts`), le gestionnaire du layout ne
  dessine plus rien, l'activation se fait dans Profil › Réglages.
- `src/app/(main)/layout.tsx` : marge basse adaptée à la pilule.
- `globals.css` : `@custom-variant dark` pour que `dark:` suive la classe de
  next-themes et non la préférence système.
- Barre de session et bandeau hors-ligne remontés au-dessus de la pilule
  (`4.75rem`).
- Titre de Commu : « Communauté » → « Commu » en capitales condensées,
  segments en pastilles ; Profil en onglets soulignés.

Composants prêts mais pas encore utilisés : `Cover`, `Frets` (phases 2 et 3).

### Phase 2 — Biblio (A · Étagère) ✅ (faite le 2026-10-09)

Fait :
- En-tête : « Biblio » + segmenté + recherche sur une ligne en ordi ; sur
  mobile la recherche se replie en loupe.
- Morceaux : une rangée de puces (Filtres, Tri, playlists), trois sections
  (étagères « En cours » et « À apprendre », aperçu de 4 « Maîtrisés »),
  le chevron ouvre la liste complète du statut (`activeFilter`).
- `song-shelf.tsx` : étagère, regroupement par album (`album`, sinon
  `cover_url`), un album « ×N » se déplie sur place.
- `song-card.tsx` : ligne à filet, sans carte ni chevron ; `songProgress()`
  partagé avec l'étagère.
- Fiche (`edit-song-modal.tsx`) : grande pochette, puces, « Jouer ce
  morceau » seul bouton ambre, statut en segmenté, « Sauvegarder » à
  l'encre. **Pas encore repris** : le contenu des onglets Tablatures,
  Covers et Sessions de la fiche.
- Albums : une rangée de puces (vues + étoiles + Ajouter), étagère
  « Tes 5 étoiles », grille de tuiles sans carte.
- Covers : puces de visibilité, tuiles vidéo sans carte.
- Recherche : icônes Lucide par type de résultat, pochettes avec liseré.
- Bug SSR de `BiblioSearchProvider` corrigé (vérifié en A/B : l'ancienne
  version reproduit l'erreur, la nouvelle non).

Restes notés pour la phase 5 : `EmptyState` (icônes Material), le champ
`SearchResult.icon` devenu inutile, les modales d'ajout.

Plan initial :

Écrans de la maquette : Biblio › Morceaux, Voir tout, Fiche morceau,
Albums, Covers, Recherche.

- `src/app/(main)/biblio/layout.tsx` : titre + segmenté sur une ligne en ordi.
- **Bug existant à corriger au passage** : `BiblioSearchProvider` appelle
  `useSearchParams()` sans frontière `<Suspense>`. Le rendu serveur de
  `/biblio` échoue (« useBiblioSearch doit être utilisé dans
  BiblioSearchProvider » dans la console) et la page se rattrape côté
  client. Envelopper la lecture de `?q=` dans un `<Suspense>`, ou passer
  la valeur initiale autrement.
- `src/components/library/library-view.tsx` : trois étagères (en cours,
  à apprendre, maîtrisés) à la place des onglets de statut ; playlists,
  filtres et tri sur **une seule** rangée de puces.
- Nouveau `src/components/library/song-shelf.tsx` : étagère horizontale,
  regroupement par album (`songs` porte `cover_url` ; regrouper sur
  l'album Spotify quand il est connu, sinon sur `cover_url`).
- « Voir tout » : la liste dense actuelle, sans carte par morceau ni chevron
  (`song-card.tsx` → ligne à filet).
- Fiche morceau (`edit-song-modal.tsx` ou vue dédiée) : grande pochette en
  tête, un seul bouton ambre « Jouer ce morceau », invitation à fixer un
  tempo cible quand il manque.
- `src/components/albums/albums-view.tsx` : garder la grille, ajouter une
  étagère « Récemment », filtres par étoiles en puces.
- `src/app/(main)/recherche/page.tsx` + `src/components/search/*`.

### Phase 3 — Jouer (B · Atelier)

Écrans : Carnet, Métronome, Exercices, Accordeur, Session en cours, Fin de
session.

- `src/components/play/play-view.tsx` et `resume-card.tsx` : nouvel onglet
  **Carnet** en premier (stats de `getPracticeStats`, calendrier de
  15 semaines, morceau à reprendre, un seul bouton « Démarrer une session »).
- Onglets en variante `underline`.
- Métronome (`src/components/practice/*`) : BPM en `font-display` très grand,
  plus de carte, réglages en grille à filets.
- Exercices : lignes groupées par catégorie, plage de tempo + `Frets`.
- Accordeur (`src/components/audio/guitar-tuner.tsx`, `tuner-gauge.tsx`) :
  note en très grand, cordes en grille de 6.
- Session (`practice-session-provider`, `practice-timer.tsx`) : plein
  écran sans barre du bas, chrono en condensé.
- Fin de session (`add-session-modal.tsx`) : 3 chiffres, humeur en un appui,
  note en serif.

### Phase 4 — Commu (C · Fanzine)

Écrans : Feed, Covers, Albums de la semaine, Amis, Défis, Groupes.

- `src/app/(main)/commu/layout.tsx` + `section-header.tsx` : titre en
  `font-display uppercase`, segments en variante `pills`. Supprimer le
  second titre « Feed » + sous-titre dans les pages.
- `src/components/social/activity-card.tsx` : pochette plein cadre pour les
  activités album / cover / morceau maîtrisé, note posée sur l'image, avis
  en `font-serif italic` coupé à 2 lignes ; activités courtes en ligne
  compacte.
- `src/components/covers/covers-feed-view.tsx` : grille d'affiches 3:4,
  la plus récente en pleine largeur.
- `src/components/albums/weekly-albums-view.tsx` : n° 1 en affiche, la suite
  en liste numérotée.
- `src/components/friends/*`, `src/components/challenges/*` (état vide en
  « affiche »), groupes et setlists.

### Phase 5 — Profil (C + B) et finitions

- `src/components/profile/profile-identity.tsx` + `profile-showcase.tsx` :
  bannière faite des 4 albums favoris, nom en condensé, bio en serif.
- Chiffres et journal (`src/components/progress/*`) en style Atelier.
- Matos, Réglages (Lucide, lignes à filets).
- Pages restantes : setlists, répètes, tech rider, jam, pricing, auth.
- Supprimer Material Symbols une fois le dernier usage parti : retirer le
  `<link>` de `src/app/layout.tsx`, `src/lib/material-symbols.ts`, le script
  `npm run icons`.
- Supprimer les animations décoratives inutilisées de `globals.css`.

---

## 4. Repères techniques

- **Jetons** : `bg-background`, `bg-card`, `bg-secondary`, `text-foreground`,
  `text-muted-foreground`, `border-border`, `bg-primary` / `text-primary`,
  `text-success`, `text-destructive`. Pas de couleur Tailwind par défaut
  (`bg-amber-500`…).
- **Polices** : `font-sans` (Jakarta), `font-display` (Barlow Condensed),
  `font-serif` (Bitter), `font-mono` (JetBrains Mono).
- **Composants du socle** : `Cover`, `Frets`, `SegmentedNav variant=…`,
  `NavIcon` (Lucide).
- **Données réelles utiles** pour vérifier : le compte de test contient
  55 morceaux (17 en cours, 31 à apprendre, 7 maîtrisés), 87 albums notés,
  4 amis, 26 sessions.
