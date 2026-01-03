-- Migration: Add song_wishlisted to activity_type enum
-- Description: Ajoute le type d'activité pour la wishlist

-- Ajouter la nouvelle valeur à l'enum activity_type
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'song_wishlisted';
