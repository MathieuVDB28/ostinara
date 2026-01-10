-- =========================================
-- Migration: Practice Mode
-- Description: Ajouter le mode Practice avec métronome et exercices structurés
-- =========================================

-- 1. Ajouter target_bpm à la table songs
ALTER TABLE songs
ADD COLUMN IF NOT EXISTS target_bpm INTEGER
CHECK (target_bpm IS NULL OR (target_bpm >= 20 AND target_bpm <= 300));

COMMENT ON COLUMN songs.target_bpm IS 'BPM cible pour ce morceau';

-- 2. Types enum pour les exercices
DO $$ BEGIN
    CREATE TYPE exercise_category AS ENUM (
        'scales',           -- Gammes
        'arpeggios',        -- Arpèges
        'picking',          -- Picking/Strumming patterns
        'chord_changes',    -- Changements d'accords
        'fingerstyle',      -- Fingerpicking
        'technique',        -- Technique générale
        'rhythm'            -- Exercices rythmiques
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE exercise_difficulty AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Table exercises (exercices prédéfinis)
CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Infos de base
    name TEXT NOT NULL,
    description TEXT,
    category exercise_category NOT NULL,
    difficulty exercise_difficulty NOT NULL DEFAULT 'beginner',

    -- Paramètres métronome
    starting_bpm INTEGER NOT NULL DEFAULT 60 CHECK (starting_bpm >= 20 AND starting_bpm <= 300),
    target_bpm INTEGER NOT NULL DEFAULT 120 CHECK (target_bpm >= 20 AND target_bpm <= 300),
    bpm_increment INTEGER NOT NULL DEFAULT 5 CHECK (bpm_increment >= 1 AND bpm_increment <= 20),
    time_signature TEXT NOT NULL DEFAULT '4/4',

    -- Instructions
    instructions TEXT[] DEFAULT '{}',
    tips TEXT[] DEFAULT '{}',
    video_url TEXT,

    -- Métadonnées
    duration_minutes INTEGER DEFAULT 5,
    is_system BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table user_exercises (progression utilisateur)
CREATE TABLE IF NOT EXISTS user_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,

    -- Progression
    current_bpm INTEGER NOT NULL DEFAULT 60 CHECK (current_bpm >= 20 AND current_bpm <= 300),
    best_bpm INTEGER NOT NULL DEFAULT 60 CHECK (best_bpm >= 20 AND best_bpm <= 300),
    total_practice_minutes INTEGER DEFAULT 0,
    sessions_count INTEGER DEFAULT 0,

    -- Dernier enregistrement
    last_practiced_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Contrainte d'unicité
    UNIQUE(user_id, exercise_id)
);

-- 5. Table practice_session_exercises (lien sessions <-> exercices)
CREATE TABLE IF NOT EXISTS practice_session_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,

    -- Performance
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    bpm_achieved INTEGER CHECK (bpm_achieved IS NULL OR (bpm_achieved >= 20 AND bpm_achieved <= 300)),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Index
CREATE INDEX IF NOT EXISTS exercises_category_idx ON exercises(category);
CREATE INDEX IF NOT EXISTS exercises_difficulty_idx ON exercises(difficulty);
CREATE INDEX IF NOT EXISTS exercises_is_system_idx ON exercises(is_system);

CREATE INDEX IF NOT EXISTS user_exercises_user_id_idx ON user_exercises(user_id);
CREATE INDEX IF NOT EXISTS user_exercises_exercise_id_idx ON user_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS user_exercises_last_practiced_idx ON user_exercises(last_practiced_at DESC);

CREATE INDEX IF NOT EXISTS pse_session_id_idx ON practice_session_exercises(practice_session_id);
CREATE INDEX IF NOT EXISTS pse_exercise_id_idx ON practice_session_exercises(exercise_id);

-- 7. Trigger updated_at pour exercises
CREATE OR REPLACE FUNCTION update_exercises_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_exercises_updated_at ON exercises;
CREATE TRIGGER update_exercises_updated_at
    BEFORE UPDATE ON exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_exercises_updated_at();

-- Trigger updated_at pour user_exercises
DROP TRIGGER IF EXISTS update_user_exercises_updated_at ON user_exercises;
CREATE TRIGGER update_user_exercises_updated_at
    BEFORE UPDATE ON user_exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_exercises_updated_at();

-- 8. RLS Policies pour exercises
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les exercices système
DROP POLICY IF EXISTS "Anyone can view system exercises" ON exercises;
CREATE POLICY "Anyone can view system exercises"
    ON exercises FOR SELECT
    USING (is_system = TRUE OR auth.uid() = created_by);

-- Les utilisateurs peuvent créer leurs propres exercices (non-système)
DROP POLICY IF EXISTS "Users can create personal exercises" ON exercises;
CREATE POLICY "Users can create personal exercises"
    ON exercises FOR INSERT
    WITH CHECK (auth.uid() = created_by AND is_system = FALSE);

-- 9. RLS Policies pour user_exercises
ALTER TABLE user_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own exercise progress" ON user_exercises;
CREATE POLICY "Users can view own exercise progress"
    ON user_exercises FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own exercise progress" ON user_exercises;
CREATE POLICY "Users can insert own exercise progress"
    ON user_exercises FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own exercise progress" ON user_exercises;
CREATE POLICY "Users can update own exercise progress"
    ON user_exercises FOR UPDATE
    USING (auth.uid() = user_id);

-- 10. RLS Policies pour practice_session_exercises
ALTER TABLE practice_session_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own session exercises" ON practice_session_exercises;
CREATE POLICY "Users can view own session exercises"
    ON practice_session_exercises FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM practice_sessions ps
            WHERE ps.id = practice_session_id
            AND ps.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own session exercises" ON practice_session_exercises;
CREATE POLICY "Users can insert own session exercises"
    ON practice_session_exercises FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM practice_sessions ps
            WHERE ps.id = practice_session_id
            AND ps.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete own session exercises" ON practice_session_exercises;
CREATE POLICY "Users can delete own session exercises"
    ON practice_session_exercises FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM practice_sessions ps
            WHERE ps.id = practice_session_id
            AND ps.user_id = auth.uid()
        )
    );

-- 11. Exercices prédéfinis (données initiales)
INSERT INTO exercises (name, description, category, difficulty, starting_bpm, target_bpm, bpm_increment, time_signature, instructions, tips, duration_minutes, is_system)
VALUES
    -- Gammes
    ('Gamme pentatonique mineure', 'La gamme la plus utilisée en rock et blues. Position 1 en La.', 'scales', 'beginner', 60, 120, 5, '4/4',
     ARRAY['Commencez en position 1 (case 5 en La)', 'Jouez chaque note en croches', 'Montez puis descendez la gamme', 'Gardez les doigts proches du manche'],
     ARRAY['Utilisez un métronome', 'Concentrez-vous sur la régularité', 'Détendez la main gauche'],
     5, TRUE),

    ('Gamme majeure - 3 octaves', 'Gamme majeure sur toute la longueur du manche.', 'scales', 'intermediate', 80, 160, 5, '4/4',
     ARRAY['Partez de la tonique grave', 'Montez sur 3 octaves', 'Utilisez le doigté 1-2-4 ou 1-3-4', 'Descendez en miroir'],
     ARRAY['Travaillez lentement d''abord', 'Visualisez les positions', 'Écoutez la justesse'],
     10, TRUE),

    -- Arpèges
    ('Arpèges majeurs', 'Arpèges des accords majeurs de base : Do, Sol, Ré.', 'arpeggios', 'beginner', 50, 100, 5, '4/4',
     ARRAY['Commencez par l''arpège de Do', 'Jouez fondamentale - tierce - quinte', 'Enchaînez avec les arpèges de Sol et Ré', 'Gardez un tempo régulier'],
     ARRAY['Laissez résonner les notes', 'Travaillez la propreté du son'],
     5, TRUE),

    ('Arpèges sweep picking', 'Technique de sweep pour arpèges rapides à 3 cordes.', 'arpeggios', 'advanced', 60, 140, 5, '4/4',
     ARRAY['Forme d''arpège à 3 cordes', 'Mouvement fluide du médiator', 'Un seul mouvement vers le bas ou le haut', 'Synchronisation main droite/gauche'],
     ARRAY['Le mouvement doit être fluide', 'Étouffez les cordes non jouées'],
     10, TRUE),

    -- Picking
    ('Alternate picking', 'Technique fondamentale du médiator en alternance.', 'picking', 'beginner', 60, 160, 10, '4/4',
     ARRAY['Une seule corde', 'Alternez bas-haut-bas-haut', 'Gardez le poignet détendu', 'Augmentez progressivement le tempo'],
     ARRAY['Le mouvement part du poignet', 'Amplitude minimale'],
     5, TRUE),

    ('Economy picking', 'Picking économique pour passages rapides sur plusieurs cordes.', 'picking', 'intermediate', 80, 160, 5, '4/4',
     ARRAY['Changement de corde dans le sens du picking', 'Minimisez les mouvements', 'Travaillez sur 3 cordes adjacentes'],
     ARRAY['Planifiez la direction du pick', 'Gardez la main détendue'],
     10, TRUE),

    -- Changements d'accords
    ('Changements accords ouverts', 'Fluidité entre accords ouverts : Em - G - D - C.', 'chord_changes', 'beginner', 40, 80, 5, '4/4',
     ARRAY['Progression : Em - G - D - C', '4 temps par accord', 'Anticipez la position suivante', 'Les doigts bougent ensemble'],
     ARRAY['Ne regardez pas le manche', 'Travaillez la mémoire musculaire'],
     5, TRUE),

    ('Changements barrés', 'Enchaînement d''accords barrés : F - Bb - C.', 'chord_changes', 'intermediate', 40, 100, 5, '4/4',
     ARRAY['F - Bb - C (position barré)', 'Gardez la forme du barré', 'Glissez le long du manche', 'Maintenez la pression uniforme'],
     ARRAY['Appuyez fort avec le pouce', 'Positionnez le barré près de la frette'],
     10, TRUE),

    -- Fingerstyle
    ('Pattern PIMA basique', 'Pattern fingerpicking fondamental pour débutants.', 'fingerstyle', 'beginner', 50, 100, 5, '4/4',
     ARRAY['P = pouce (basses), I = index, M = majeur, A = annulaire', 'Pattern : P-I-M-A-M-I', 'Commencez sur un accord de Do', 'Gardez la main droite stable'],
     ARRAY['Les doigts restent au-dessus des cordes', 'Ne tirez pas les cordes vers le haut'],
     5, TRUE),

    ('Travis picking', 'Technique de basse alternée popularisée par Merle Travis.', 'fingerstyle', 'intermediate', 60, 120, 5, '4/4',
     ARRAY['Le pouce alterne entre 2 cordes de basse', 'Les doigts jouent la mélodie', 'Indépendance des mains', 'Commencez très lentement'],
     ARRAY['Le pouce est le métronome', 'Séparez les exercices mains'],
     15, TRUE),

    -- Technique
    ('Hammer-ons et pull-offs', 'Technique legato pour liaisons fluides.', 'technique', 'beginner', 60, 140, 10, '4/4',
     ARRAY['Hammer : frappez la corde avec le doigt', 'Pull-off : tirez légèrement en relâchant', 'Exercice 1-2-3-4 sur une corde', 'Gardez le volume uniforme'],
     ARRAY['La force vient du doigt, pas du bras', 'Gardez les doigts proches des frettes'],
     5, TRUE),

    ('Bends et vibratos', 'Expression et justesse des bends.', 'technique', 'intermediate', 50, 80, 5, '4/4',
     ARRAY['Bend d''un ton puis d''un demi-ton', 'Vérifiez la justesse avec la note cible', 'Vibrato : oscillation régulière', 'Partez du poignet'],
     ARRAY['Renforcez avec les doigts adjacents', 'Le vibrato doit être musical'],
     10, TRUE),

    -- Rythme
    ('Strumming patterns', 'Patterns rythmiques essentiels pour accompagnement.', 'rhythm', 'beginner', 60, 120, 10, '4/4',
     ARRAY['Pattern 1 : D D D D (noires)', 'Pattern 2 : D D U U D U', 'Pattern 3 : D U D U D U D U (croches)', 'Gardez le bras en mouvement constant'],
     ARRAY['Le bras ne s''arrête jamais', 'Accentuez les temps forts'],
     5, TRUE),

    ('Syncopes et ghost notes', 'Rythmes funk avancés avec ghost notes.', 'rhythm', 'advanced', 80, 140, 5, '4/4',
     ARRAY['Accentuez les contretemps', 'Ghost notes : effleurez les cordes', 'Funk rhythm patterns', 'Travaillez avec un backtrack'],
     ARRAY['Écoutez beaucoup de funk', 'Le groove est dans le placement'],
     10, TRUE)

ON CONFLICT DO NOTHING;
