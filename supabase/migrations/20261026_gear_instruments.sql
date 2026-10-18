-- Migration: le matos des autres instruments
--
-- Le materiel ne connaissait que la guitare, la basse et leur chaine
-- (ampli, pedales). Un batteur range ses futs et ses cymbales, un
-- claviériste son clavier. Les micros restent dans « Enregistrement ».

ALTER TYPE gear_type ADD VALUE IF NOT EXISTS 'drums';
ALTER TYPE gear_type ADD VALUE IF NOT EXISTS 'cymbals';
ALTER TYPE gear_type ADD VALUE IF NOT EXISTS 'keyboard';
