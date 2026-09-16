-- =============================================================================
-- Migration : plan hebdomadaire, progression au tempo, feed de covers, pont tab
-- Date : 2026-09-16
--
-- Cinq chantiers, un seul aller-retour en base :
--   1. weekly_goals      — le plan de la semaine, trois objectifs cochables
--   2. songs.tab_*       — la tab analysee reste sur le morceau (pont Songsterr)
--   3. covers.reply_to   — repondre a une cover par une cover
--   4. RLS covers/songs  — un ami doit pouvoir voir une cover "amis"
--   5. index de feed     — la lecture chronologique des covers d'un cercle
-- =============================================================================


-- =============================================================================
-- 1. Plan de travail hebdomadaire
--
-- L'app enregistrait tres bien le passe et ne proposait rien pour la semaine
-- qui vient. Trois objectifs par semaine, derives de l'etat reel de la
-- bibliotheque et du journal, cochables a la main.
--
-- Une ligne = un objectif. Pas de table "plan" : la semaine est une date,
-- le lundi, et trois lignes qui la portent.
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE weekly_goal_kind AS ENUM (
    'tempo',      -- monter un morceau de N BPM
    'mastery',    -- faire passer un morceau en "maitrise"
    'minutes',    -- N minutes de pratique dans la semaine
    'days',       -- jouer N jours dans la semaine
    'section',    -- travailler une section precise d'un morceau
    'cover',      -- enregistrer une cover
    'song_start'  -- sortir un morceau de la file "a apprendre"
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Le lundi de la semaine concernee, en date locale de generation.
  week_start DATE NOT NULL,

  kind weekly_goal_kind NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,

  -- Le morceau vise, quand l'objectif en designe un.
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,

  -- La cible et le point de depart mesure au moment de la generation :
  -- sans baseline, "monter a 96 BPM" ne dit pas d'ou l'on part, et la
  -- barre de progression partirait toujours de zero.
  target_value INTEGER,
  baseline_value INTEGER DEFAULT 0,

  -- 'bpm' | 'min' | 'jour' | NULL — l'unite affichee, pas une contrainte.
  unit TEXT,

  position SMALLINT NOT NULL DEFAULT 0,

  -- Coche manuelle. Un objectif peut aussi etre atteint par la mesure :
  -- les deux chemins sont lus a l'affichage, seul celui-ci est ecrit.
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS weekly_goals_user_week_idx
  ON weekly_goals(user_id, week_start DESC);

-- Un seul plan par semaine : la generation est idempotente, deux onglets
-- ouverts un lundi matin ne doivent pas produire six objectifs.
CREATE UNIQUE INDEX IF NOT EXISTS weekly_goals_user_week_position_idx
  ON weekly_goals(user_id, week_start, position);

ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own weekly goals"
    ON weekly_goals FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own weekly goals"
    ON weekly_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own weekly goals"
    ON weekly_goals FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own weekly goals"
    ON weekly_goals FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- =============================================================================
-- 2. Le pont vers la tablature vit sur le morceau
--
-- L'analyse Songsterr (BPM, chiffrage, sections) etait calculee a la volee
-- puis jetee : rouvrir un morceau relancait le telechargement du fichier GP.
-- Elle se range ici, a cote du morceau, pour que "ouvrir un morceau" donne
-- la tab, le tempo et le metronome deja cales.
-- =============================================================================

ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS songsterr_id INTEGER,
  ADD COLUMN IF NOT EXISTS tab_bpm INTEGER,
  ADD COLUMN IF NOT EXISTS tab_time_signature_beats SMALLINT,
  ADD COLUMN IF NOT EXISTS tab_time_signature_value SMALLINT,
  ADD COLUMN IF NOT EXISTS tab_total_measures INTEGER,
  ADD COLUMN IF NOT EXISTS tab_sections JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tab_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN songs.songsterr_id IS 'Identifiant Songsterr, extrait de tabs_url ou choisi dans la recherche';
COMMENT ON COLUMN songs.tab_bpm IS 'Tempo lu dans le fichier Guitar Pro — la verite de la partition';
COMMENT ON COLUMN songs.tab_sections IS 'Sections jouees : [{name, startMeasure, endMeasure}]';


-- =============================================================================
-- 3. Repondre a une cover par une cover
--
-- C'est le seul contenu vraiment social de l'app. Une reponse en cover
-- est une cover comme une autre : meme table, un lien de parente en plus.
-- ON DELETE SET NULL : supprimer l'originale ne doit pas effacer la reponse.
-- =============================================================================

ALTER TABLE covers
  ADD COLUMN IF NOT EXISTS reply_to_cover_id UUID REFERENCES covers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS covers_reply_to_idx
  ON covers(reply_to_cover_id) WHERE reply_to_cover_id IS NOT NULL;

-- Le feed se lit par date, sur les seules covers partagees.
CREATE INDEX IF NOT EXISTS covers_shared_feed_idx
  ON covers(created_at DESC) WHERE visibility IN ('friends', 'public');


-- =============================================================================
-- 4. Une cover "amis" doit etre visible... par les amis
--
-- Les politiques d'origine n'autorisaient que "ses propres covers" et
-- "les covers publiques". Une cover reglee sur "Amis" n'etait donc visible
-- de personne d'autre que son auteur — le feed filtrait deja sur
-- visibility IN ('friends','public') et ne remontait que les publiques.
-- =============================================================================

DO $$ BEGIN
  CREATE POLICY "Friends can view friends covers"
    ON covers FOR SELECT
    USING (
      visibility = 'friends'
      AND EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.status = 'accepted'
          AND (
            (f.requester_id = auth.uid() AND f.addressee_id = covers.user_id)
            OR (f.addressee_id = auth.uid() AND f.requester_id = covers.user_id)
          )
      )
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Le morceau derriere une cover partagee, et rien d'autre.
--
-- songs reste strictement prive : cette politique n'ouvre que les lignes
-- deja atteignables par une cover que le lecteur a le droit de voir. Sans
-- elle, le feed affichait des covers sans titre ni artiste.
DO $$ BEGIN
  CREATE POLICY "Users can view songs behind shared covers"
    ON songs FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM covers c
        WHERE c.song_id = songs.id
          AND (
            c.visibility = 'public'
            OR (
              c.visibility = 'friends'
              AND EXISTS (
                SELECT 1 FROM friendships f
                WHERE f.status = 'accepted'
                  AND (
                    (f.requester_id = auth.uid() AND f.addressee_id = songs.user_id)
                    OR (f.addressee_id = auth.uid() AND f.requester_id = songs.user_id)
                  )
              )
            )
          )
      )
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;
