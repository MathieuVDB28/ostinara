import type { GearItem, GearItemDetails } from "@/types";
import { one } from "@/lib/supabase/joins";

/**
 * Ce que tout le monde peut lire d'un matos (selon sa visibilite).
 *
 * Le numero de serie, l'etat, le prix, la date d'achat et les notes vivent
 * dans `gear_item_private`, lisible par son seul proprietaire
 * (migration 20261109_gear_private). Le matos d'un autre se lit avec ces
 * colonnes, jamais en `select("*")`.
 */
export const PUBLIC_GEAR_COLUMNS =
  "id, user_id, type, brand, model, year, color, image_url, is_active, visibility, created_at, updated_at" as const;

export const GEAR_DETAIL_KEYS = ["serial_number", "condition", "purchase_price", "purchase_date", "notes"] as const;

/** Mon matos : le public et le detail prive, a aplatir avec `withGearDetails`. */
export const OWN_GEAR_SELECT =
  `${PUBLIC_GEAR_COLUMNS}, details:gear_item_private(serial_number, condition, purchase_price, purchase_date, notes)` as const;

type RawGear = Omit<GearItem, keyof GearItemDetails> & {
  details?: Partial<Record<keyof GearItemDetails, unknown>> | Partial<Record<keyof GearItemDetails, unknown>>[] | null;
};

/** Remet le detail prive a plat sur la ligne (champs absents s'il n'y en a pas). */
export function withGearDetails(row: RawGear): GearItem {
  const { details, ...gear } = row;
  const found = one(details);
  if (!found) return gear as GearItem;
  const flat: Partial<GearItemDetails> = {};
  for (const key of GEAR_DETAIL_KEYS) {
    const value = found[key];
    if (value !== null && value !== undefined) Object.assign(flat, { [key]: value });
  }
  return { ...gear, ...flat } as GearItem;
}

/** Separe l'entree d'un formulaire en colonnes publiques et detail prive. */
export function splitGearInput<T extends Partial<Record<keyof GearItemDetails, unknown>>>(
  input: T
): { publicPart: Omit<T, keyof GearItemDetails>; details: Partial<Pick<T, keyof GearItemDetails & keyof T>> } {
  const publicPart: Record<string, unknown> = {};
  const details: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if ((GEAR_DETAIL_KEYS as readonly string[]).includes(key)) details[key] = value;
    else publicPart[key] = value;
  }
  return {
    publicPart: publicPart as Omit<T, keyof GearItemDetails>,
    details: details as Partial<Pick<T, keyof GearItemDetails & keyof T>>,
  };
}
