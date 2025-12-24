-- =============================================
-- Migration: Friendships & Activities
-- Date: 2024-12-25
-- Description: Tables pour le système d'amis et le feed d'activité
-- =============================================

-- Types enum
CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'blocked');
CREATE TYPE activity_type AS ENUM ('song_added', 'song_mastered', 'cover_posted', 'friend_added');

-- =============================================
-- Table: friendships
-- =============================================
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status friendship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Contrainte : pas d'auto-amitié
  CONSTRAINT no_self_friendship CHECK (requester_id != addressee_id),
  -- Contrainte : une seule relation par paire d'utilisateurs (dans un sens)
  CONSTRAINT unique_friendship UNIQUE (requester_id, addressee_id)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS friendships_requester_idx ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS friendships_status_idx ON friendships(status);
CREATE INDEX IF NOT EXISTS friendships_created_at_idx ON friendships(created_at DESC);

-- =============================================
-- Table: activities
-- =============================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type activity_type NOT NULL,
  reference_id UUID, -- ID du morceau, cover, ou profil ami
  metadata JSONB DEFAULT '{}', -- Données additionnelles (titre, artiste, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS activities_user_id_idx ON activities(user_id);
CREATE INDEX IF NOT EXISTS activities_created_at_idx ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS activities_type_idx ON activities(type);

-- =============================================
-- Trigger: updated_at pour friendships
-- =============================================
CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- RLS: Activer
-- =============================================
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies: friendships
-- =============================================

-- Les utilisateurs peuvent voir leurs propres demandes (envoyées ou reçues)
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Les utilisateurs peuvent envoyer des demandes d'amitié
CREATE POLICY "Users can send friend requests"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id AND status = 'pending');

-- Les utilisateurs peuvent mettre à jour les demandes qu'ils reçoivent (accepter)
-- Ou les demandes qu'ils ont envoyées (annuler)
CREATE POLICY "Users can update friendships"
  ON friendships FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Les utilisateurs peuvent supprimer leurs amitiés
CREATE POLICY "Users can delete own friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- =============================================
-- RLS Policies: activities
-- =============================================

-- Les utilisateurs peuvent voir leurs propres activités et celles de leurs amis acceptés
CREATE POLICY "Users can view own and friends activities"
  ON activities FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND (
        (requester_id = auth.uid() AND addressee_id = activities.user_id)
        OR (addressee_id = auth.uid() AND requester_id = activities.user_id)
      )
    )
  );

-- Les utilisateurs peuvent créer leurs propres activités
CREATE POLICY "Users can create own activities"
  ON activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Les utilisateurs peuvent supprimer leurs propres activités
CREATE POLICY "Users can delete own activities"
  ON activities FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- RLS Policies supplémentaires: songs (amis peuvent voir)
-- =============================================

-- Les amis peuvent voir les morceaux
CREATE POLICY "Friends can view songs"
  ON songs FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND (
        (requester_id = auth.uid() AND addressee_id = songs.user_id)
        OR (addressee_id = auth.uid() AND requester_id = songs.user_id)
      )
    )
  );

-- =============================================
-- RLS Policies supplémentaires: covers (amis peuvent voir si friends/public)
-- =============================================

-- Les amis peuvent voir les covers avec visibility 'friends' ou 'public'
CREATE POLICY "Friends can view friend-visible covers"
  ON covers FOR SELECT
  USING (
    user_id = auth.uid()
    OR visibility = 'public'
    OR (
      visibility = 'friends'
      AND EXISTS (
        SELECT 1 FROM friendships
        WHERE status = 'accepted'
        AND (
          (requester_id = auth.uid() AND addressee_id = covers.user_id)
          OR (addressee_id = auth.uid() AND requester_id = covers.user_id)
        )
      )
    )
  );
