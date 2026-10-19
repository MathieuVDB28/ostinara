-- Migration: l'equipe editoriale (blog + forum)
--
-- Deux roles, portes par profiles.staff_role (NULL = membre ordinaire) :
--   - admin  : nomme et retire les autres, comme un editor ;
--   - editor : ecrit sur le blog et modere le forum.
-- Ecrire sur le blog donne la moderation du forum : un seul role, pas deux.
--
-- staff_role ne s'ecrit jamais depuis le navigateur (trigger ci-dessous,
-- sur le modele de protect_profile_billing) : il passe par set_staff_role,
-- reservee aux admins. Le premier admin se nomme a la main, dans le SQL
-- editor de Supabase :
--   UPDATE profiles SET staff_role = 'admin' WHERE username = '<pseudo>';
--
-- On peut demander a rejoindre l'equipe (staff_applications) : une demande
-- en attente par personne, examinee par un admin.

DO $$ BEGIN
  CREATE TYPE staff_role AS ENUM ('admin', 'editor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE staff_application_status AS ENUM ('pending', 'accepted', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS staff_role staff_role;

-- === Le role ne se modifie pas directement ===
CREATE OR REPLACE FUNCTION protect_profile_staff_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- service_role, postgres et les fonctions SECURITY DEFINER passent.
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.staff_role := NULL;
  ELSIF NEW.staff_role IS DISTINCT FROM OLD.staff_role THEN
    RAISE EXCEPTION 'Le role d''equipe ne se modifie pas directement'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_staff_role ON profiles;
CREATE TRIGGER protect_profile_staff_role
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_staff_role();

-- === Qui est de l'equipe (pour les policies du blog et du forum) ===
CREATE OR REPLACE FUNCTION is_staff(p_user UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_user AND staff_role IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION is_staff_admin(p_user UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_user AND staff_role = 'admin'
  );
$$;

-- === Demandes pour rejoindre l'equipe ===
CREATE TABLE IF NOT EXISTS staff_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  motivation TEXT NOT NULL CHECK (char_length(motivation) BETWEEN 20 AND 2000),
  -- Blog, chaine, articles deja ecrits… (texte libre, quelques liens)
  links TEXT CHECK (char_length(links) <= 500),
  status staff_application_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Une seule demande en attente a la fois
CREATE UNIQUE INDEX IF NOT EXISTS staff_applications_one_pending
  ON staff_applications (user_id) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS staff_applications_status_idx
  ON staff_applications (status, created_at DESC);

ALTER TABLE staff_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own applications, admins see all" ON staff_applications;
CREATE POLICY "Users see own applications, admins see all"
  ON staff_applications FOR SELECT
  USING (auth.uid() = user_id OR is_staff_admin());

-- On depose sa demande, en attente, si l'on n'est pas deja de l'equipe.
DROP POLICY IF EXISTS "Users apply for themselves" ON staff_applications;
CREATE POLICY "Users apply for themselves"
  ON staff_applications FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND NOT is_staff()
  );

-- On retire sa demande tant qu'elle attend.
DROP POLICY IF EXISTS "Users withdraw pending applications" ON staff_applications;
CREATE POLICY "Users withdraw pending applications"
  ON staff_applications FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');

-- Pas de policy UPDATE : l'examen passe par review_staff_application.

-- === Nommer / retirer un membre de l'equipe (admins) ===
CREATE OR REPLACE FUNCTION set_staff_role(p_user_id UUID, p_role staff_role)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_staff_admin() THEN
    RAISE EXCEPTION 'Reserve aux admins' USING ERRCODE = '42501';
  END IF;

  -- Un admin ne se retrograde pas lui-meme : il reste toujours au moins
  -- quelqu'un pour nommer les autres.
  IF p_user_id = auth.uid() AND p_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Un admin ne retire pas son propre role' USING ERRCODE = '42501';
  END IF;

  UPDATE profiles SET staff_role = p_role WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil introuvable';
  END IF;
END;
$$;

-- === Accepter / refuser une demande (admins) ===
-- Accepter nomme editor ; un admin se nomme ensuite avec set_staff_role.
CREATE OR REPLACE FUNCTION review_staff_application(p_application_id UUID, p_accept BOOLEAN)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
BEGIN
  IF NOT is_staff_admin() THEN
    RAISE EXCEPTION 'Reserve aux admins' USING ERRCODE = '42501';
  END IF;

  UPDATE staff_applications
     SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END::staff_application_status,
         reviewed_by = auth.uid(),
         reviewed_at = NOW()
   WHERE id = p_application_id AND status = 'pending'
  RETURNING user_id INTO v_user;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Demande introuvable ou deja examinee';
  END IF;

  IF p_accept THEN
    UPDATE profiles SET staff_role = 'editor'
     WHERE id = v_user AND staff_role IS NULL;
  END IF;

  RETURN v_user;
END;
$$;

REVOKE EXECUTE ON FUNCTION set_staff_role(UUID, staff_role) FROM anon;
REVOKE EXECUTE ON FUNCTION review_staff_application(UUID, BOOLEAN) FROM anon;
