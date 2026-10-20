-- Migration: les sessions de pratique arrivent dans le feed des amis
--
-- Une session enregistree (chronometree ou ajoutee apres coup) devient une
-- activite `session_completed` : les amis la voient dans le feed et
-- recoivent une notification. Le musicien peut ne pas partager une session
-- (case dans la modale), ou ne plus partager d'office (reglage ci-dessous).

ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'session_completed';

-- Le choix par defaut de la case « Partager avec mes amis ». Prive : c'est
-- un reglage, pas une information a montrer.
ALTER TABLE profile_private
  ADD COLUMN IF NOT EXISTS share_sessions BOOLEAN NOT NULL DEFAULT true;

-- Corriger une session (duree, tempo, note) corrige ce qu'en voient les
-- amis : l'activite reprend ses chiffres. Jusqu'ici une activite ne se
-- modifiait jamais, il n'y avait pas de policy UPDATE.
DROP POLICY IF EXISTS "Users can update own activities" ON activities;
CREATE POLICY "Users can update own activities"
  ON activities FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
