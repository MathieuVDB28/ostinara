-- Migration: concerts et page publique du groupe (F7)
--
-- Un concert est une setlist de groupe qui a une date (concert_date). Elle
-- gagne une heure, une ville et un lien de billetterie.
--
-- Chaque groupe a une page publique /groupe/<slug> : presentation, line-up
-- (pseudo et poste de chacun), concerts a venir et passes, et ce qui a ete
-- joue aux concerts passes (titres et artistes). Publique par defaut, groupes
-- existants compris ; le titulaire et les admins la masquent ou changent son
-- adresse (RPC set_band_public_page). Un groupe en lecture seule n'a plus de
-- page publique. La fiche technique reste privee.
--
-- La page se lit sans compte par get_public_band, qui ne renvoie que ces
-- champs : bands, band_members, profiles et setlists gardent leur RLS.

-- === Les champs d'un concert ===
ALTER TABLE setlists
  ADD COLUMN IF NOT EXISTS concert_time TIME,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS ticket_url TEXT;

ALTER TABLE setlists DROP CONSTRAINT IF EXISTS setlists_city_length;
ALTER TABLE setlists ADD CONSTRAINT setlists_city_length CHECK (char_length(city) <= 120);
ALTER TABLE setlists DROP CONSTRAINT IF EXISTS setlists_ticket_url_check;
ALTER TABLE setlists ADD CONSTRAINT setlists_ticket_url_check
  CHECK (ticket_url IS NULL OR (char_length(ticket_url) <= 2000 AND ticket_url ~* '^https?://'));

CREATE INDEX IF NOT EXISTS setlists_band_concert_idx
  ON setlists (band_id, concert_date)
  WHERE band_id IS NOT NULL AND concert_date IS NOT NULL;

-- === L'adresse et la visibilite de la page ===
ALTER TABLE bands
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS public_page BOOLEAN NOT NULL DEFAULT true;

-- « Les Creamy Boys ! » → « les-creamy-boys ».
CREATE OR REPLACE FUNCTION band_slug_base(p_name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(btrim(left(btrim(regexp_replace(
    translate(lower(COALESCE(p_name, '')),
      'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ',
      'aaaaaaceeeeiiiinooooouuuuyyoa'),
    '[^a-z0-9]+', '-', 'g'), '-'), 50), '-'), ''), 'groupe');
$$;

-- La premiere adresse libre : base, base-2, base-3… Hors RLS : les adresses
-- des groupes dont on n'est pas membre comptent aussi.
CREATE OR REPLACE FUNCTION band_free_slug(p_base TEXT, p_band_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base TEXT := btrim(p_base, '-');
  v_slug TEXT;
  v_n INTEGER := 1;
BEGIN
  IF char_length(v_base) < 3 THEN
    v_base := btrim(v_base || '-groupe', '-');
  END IF;
  v_slug := v_base;
  WHILE EXISTS (SELECT 1 FROM bands WHERE slug = v_slug AND id IS DISTINCT FROM p_band_id) LOOP
    v_n := v_n + 1;
    v_slug := left(v_base, 55) || '-' || v_n;
  END LOOP;
  RETURN v_slug;
END;
$$;

-- Les groupes existants recoivent leur adresse, les plus anciens d'abord.
DO $$
DECLARE
  v_band RECORD;
BEGIN
  FOR v_band IN SELECT id, name FROM bands WHERE slug IS NULL ORDER BY created_at, id LOOP
    UPDATE bands SET slug = band_free_slug(band_slug_base(v_band.name), v_band.id) WHERE id = v_band.id;
  END LOOP;
END;
$$;

ALTER TABLE bands ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS bands_slug_key ON bands (slug);
ALTER TABLE bands DROP CONSTRAINT IF EXISTS bands_slug_format;
ALTER TABLE bands ADD CONSTRAINT bands_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$');

-- Un nouveau groupe recoit son adresse depuis son nom.
CREATE OR REPLACE FUNCTION set_band_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR current_user IN ('anon', 'authenticated') THEN
    NEW.slug := band_free_slug(band_slug_base(NEW.name), NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION band_free_slug(TEXT, UUID) FROM PUBLIC;
-- Appelee par le trigger de creation, sous les droits de qui cree le groupe.
GRANT EXECUTE ON FUNCTION band_free_slug(TEXT, UUID) TO authenticated;

DROP TRIGGER IF EXISTS set_band_slug ON bands;
CREATE TRIGGER set_band_slug
  BEFORE INSERT ON bands
  FOR EACH ROW EXECUTE FUNCTION set_band_slug();

-- L'adresse et la visibilite ne changent que par set_band_public_page.
CREATE OR REPLACE FUNCTION protect_band_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.plan_lapsed_at IS DISTINCT FROM OLD.plan_lapsed_at
     OR NEW.slug IS DISTINCT FROM OLD.slug
     OR NEW.public_page IS DISTINCT FROM OLD.public_page THEN
    RAISE EXCEPTION 'Ces champs ne se modifient pas directement' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

-- Masquer ou montrer la page, changer son adresse : titulaire et admins d'un
-- groupe actif. `p_slug` NULL garde l'adresse. Renvoie l'adresse retenue.
CREATE OR REPLACE FUNCTION set_band_public_page(p_band_id UUID, p_public BOOLEAN, p_slug TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT is_band_admin_or_owner(p_band_id, auth.uid()) THEN
    RAISE EXCEPTION 'Reserve au titulaire et aux admins' USING ERRCODE = '42501';
  END IF;
  IF NOT band_is_active(p_band_id) THEN
    RAISE EXCEPTION 'Groupe en lecture seule' USING ERRCODE = '42501';
  END IF;

  IF p_slug IS NOT NULL THEN
    v_slug := lower(btrim(p_slug));
    IF v_slug !~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$' THEN
      RAISE EXCEPTION 'Adresse invalide' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (SELECT 1 FROM bands WHERE slug = v_slug AND id <> p_band_id) THEN
      RAISE EXCEPTION 'Adresse deja prise' USING ERRCODE = '23505';
    END IF;
  END IF;

  UPDATE bands
     SET public_page = COALESCE(p_public, public_page),
         slug = COALESCE(v_slug, slug),
         updated_at = now()
   WHERE id = p_band_id
  RETURNING slug INTO v_slug;

  RETURN v_slug;
END;
$$;

REVOKE ALL ON FUNCTION set_band_public_page(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_band_public_page(UUID, BOOLEAN, TEXT) TO authenticated;

-- === La page publique ===
-- Rien pour une page masquee, un groupe en lecture seule ou une adresse inconnue.
CREATE OR REPLACE FUNCTION get_public_band(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_band RECORD;
  v_today DATE := (now() AT TIME ZONE 'Europe/Paris')::DATE;
BEGIN
  SELECT id, name, description, cover_url, slug, updated_at
    INTO v_band
    FROM bands
   WHERE slug = lower(p_slug) AND public_page;

  IF NOT FOUND OR NOT band_is_active(v_band.id) THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'name', v_band.name,
    'description', v_band.description,
    'cover_url', v_band.cover_url,
    'slug', v_band.slug,
    'updated_at', v_band.updated_at,
    'members', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'username', p.username,
               'display_name', p.display_name,
               'avatar_url', p.avatar_url,
               'is_private', COALESCE(p.is_private, true),
               'instrument', m.instrument,
               'instrument_label', m.instrument_label,
               'role', m.role
             ) ORDER BY (m.role = 'owner') DESC, m.joined_at, p.username)
        FROM band_members m
        JOIN profiles p ON p.id = m.user_id
       WHERE m.band_id = v_band.id
    ), '[]'::jsonb),
    'upcoming', COALESCE((
      SELECT jsonb_agg(c ORDER BY c->>'date', c->>'time' NULLS LAST)
        FROM (
          SELECT jsonb_build_object(
                   'name', s.name, 'date', s.concert_date, 'time', to_char(s.concert_time, 'HH24:MI'),
                   'venue', s.venue, 'city', s.city, 'ticket_url', s.ticket_url
                 ) AS c
            FROM setlists s
           WHERE s.band_id = v_band.id AND s.concert_date >= v_today
           ORDER BY s.concert_date, s.concert_time NULLS LAST
           LIMIT 50
        ) upcoming
    ), '[]'::jsonb),
    'past', COALESCE((
      SELECT jsonb_agg(c ORDER BY c->>'date' DESC)
        FROM (
          SELECT jsonb_build_object(
                   'name', s.name, 'date', s.concert_date, 'time', to_char(s.concert_time, 'HH24:MI'),
                   'venue', s.venue, 'city', s.city,
                   'songs', COALESCE((
                     SELECT jsonb_agg(jsonb_build_object(
                              'title', COALESCE(i.song_title, so.title),
                              'artist', COALESCE(i.song_artist, so.artist)
                            ) ORDER BY i.position)
                       FROM setlist_items i
                       LEFT JOIN songs so ON so.id = i.song_id
                      WHERE i.setlist_id = s.id
                        AND i.item_type = 'song'
                        AND COALESCE(i.song_title, so.title) IS NOT NULL
                   ), '[]'::jsonb)
                 ) AS c
            FROM setlists s
           WHERE s.band_id = v_band.id AND s.concert_date < v_today
           ORDER BY s.concert_date DESC
           LIMIT 30
        ) past
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION get_public_band(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_public_band(TEXT) TO anon, authenticated;

-- Pour le sitemap : les pages en ligne.
CREATE OR REPLACE FUNCTION list_public_bands()
RETURNS TABLE (slug TEXT, updated_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT b.slug, b.updated_at
    FROM bands b
   WHERE b.public_page AND band_is_active(b.id)
   ORDER BY b.updated_at DESC
   LIMIT 5000;
$$;

REVOKE ALL ON FUNCTION list_public_bands() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_public_bands() TO anon, authenticated;
