import type { CoverGearTag } from "@/types";

/**
 * Le matos d'une cover, embarque dans la lecture des covers.
 *
 * Passe par cover_gear -> gear_items : un equipement prive n'est pas
 * lisible par un ami (RLS de gear_items), il revient alors `null` et
 * disparait de la liste au lieu de casser la carte.
 */
export const COVER_GEAR_SELECT = "cover_gear(gear:gear_items(id, type, brand, model))";

interface RawCoverGear {
  cover_gear?: { gear: CoverGearTag | CoverGearTag[] | null }[] | null;
}

/** Aplatit `cover_gear` en `gear` sur une ligne de cover. */
export function withCoverGear<T extends RawCoverGear>(
  cover: T
): Omit<T, "cover_gear"> & { gear: CoverGearTag[] } {
  const { cover_gear, ...rest } = cover;
  const gear = (cover_gear ?? [])
    .map((row) => (Array.isArray(row.gear) ? row.gear[0] : row.gear))
    .filter((item): item is CoverGearTag => Boolean(item));
  return { ...rest, gear };
}
