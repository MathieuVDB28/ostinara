-- Migration: abonnement agenda (Pro et Band)
--
-- Un lien secret par musicien, lu par Google Agenda ou Apple sans connexion
-- (/api/agenda/<token>, service role). Le changer coupe l'ancien ; le plan est
-- reverifie a chaque lecture.

CREATE TABLE IF NOT EXISTS calendar_feeds (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE calendar_feeds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their calendar feed" ON calendar_feeds;
CREATE POLICY "Users read their calendar feed"
  ON calendar_feeds FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users delete their calendar feed" ON calendar_feeds;
CREATE POLICY "Users delete their calendar feed"
  ON calendar_feeds FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Creer son lien, ou le remplacer.
CREATE OR REPLACE FUNCTION renew_calendar_feed()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_token UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT has_paid_plan(auth.uid()) THEN
    RAISE EXCEPTION 'calendar_feed_paid';
  END IF;
  INSERT INTO calendar_feeds (user_id) VALUES (auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET token = gen_random_uuid(), created_at = now()
  RETURNING token INTO v_token;
  RETURN v_token;
END;
$$;
REVOKE ALL ON FUNCTION renew_calendar_feed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION renew_calendar_feed() TO authenticated;
