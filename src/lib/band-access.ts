import type { UserPlan } from "@/types";

/** Un groupe : le titulaire et 4 invites. */
export const BAND_MAX_MEMBERS = 5;
/** Delai avant la lecture seule, quand le titulaire quitte le plan Band. */
export const BAND_GRACE_DAYS = 30;

export type BandStatus = "active" | "grace" | "read_only";

interface BandPlanInfo {
  plan_lapsed_at?: string | null;
  owner?: { plan?: UserPlan } | null;
}

/** Meme regle que `band_is_active` en base, qui reste seule a faire foi. */
export function bandStatus(band: BandPlanInfo, now = Date.now()): BandStatus {
  if (band.owner?.plan === "band") return "active";
  const end = bandGraceEnd(band);
  return end && end.getTime() > now ? "grace" : "read_only";
}

export function bandGraceEnd(band: Pick<BandPlanInfo, "plan_lapsed_at">): Date | null {
  if (!band.plan_lapsed_at) return null;
  return new Date(new Date(band.plan_lapsed_at).getTime() + BAND_GRACE_DAYS * 24 * 60 * 60 * 1000);
}
