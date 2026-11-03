-- Migration: notifications des setlists de groupe
--
-- Les membres d'un groupe sont prevenus quand une setlist du groupe est
-- creee, modifiee ou supprimee. Les modifications arrivent en resume : un
-- membre qui ajoute dix morceaux d'affilee envoie une notification, pas dix.
--
-- `setlist_change_log` note chaque geste. Il sert deux fois : au resume
-- envoye au groupe (`notified_at` rempli une fois le resume parti ; les
-- gestes d'un meme resume partagent la meme valeur) et a l'historique de la
-- setlist (« Modifiee par Lea il y a 2 h », liste des changements). Il est
-- garde sans limite. Ecrit par le serveur seulement (service role), lu par
-- les membres du groupe.
--
-- `band_members.setlist_notifications` : chacun coupe ces notifications pour
-- un groupe, sans toucher au reste (repetes, chat, jam).

ALTER TABLE band_members
  ADD COLUMN IF NOT EXISTS setlist_notifications BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS setlist_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setlist_id UUID NOT NULL REFERENCES setlists(id) ON DELETE CASCADE,
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('item_added', 'item_removed', 'item_updated', 'reordered', 'details_updated')),
  item_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS setlist_change_log_pending_idx
  ON setlist_change_log (setlist_id, user_id, created_at)
  WHERE notified_at IS NULL;

CREATE INDEX IF NOT EXISTS setlist_change_log_history_idx
  ON setlist_change_log (setlist_id, created_at DESC);

ALTER TABLE setlist_change_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Band members can read setlist history" ON setlist_change_log;
CREATE POLICY "Band members can read setlist history"
  ON setlist_change_log FOR SELECT
  TO authenticated
  USING (is_band_member(band_id, auth.uid()));

-- === Couper / remettre les notifications des setlists d'un groupe, pour soi ===
-- La policy UPDATE de band_members est reservee au proprietaire : on passe
-- par ici pour ne toucher qu'a sa propre ligne, et qu'a ce reglage.
CREATE OR REPLACE FUNCTION set_band_setlist_notifications(
  p_band_id UUID,
  p_enabled BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifie';
  END IF;

  UPDATE band_members
     SET setlist_notifications = p_enabled
   WHERE band_id = p_band_id
     AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membre introuvable';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION set_band_setlist_notifications(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_band_setlist_notifications(UUID, BOOLEAN) TO authenticated;
