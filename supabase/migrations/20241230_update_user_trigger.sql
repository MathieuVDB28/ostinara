-- Migration : Mise à jour du trigger de création d'utilisateur
-- Date : 2024-12-30
-- Ajoute le support du champ is_private lors de la création automatique du profil

-- ============================================================
-- Mise à jour de la fonction handle_new_user
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, is_private)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'is_private')::boolean, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Le trigger existe déjà et utilise automatiquement la nouvelle fonction
-- Pas besoin de le recréer
