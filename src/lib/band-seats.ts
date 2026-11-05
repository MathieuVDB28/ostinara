import type { UserPlan } from "@/types";

/** Les places a offrir : avec le titulaire, 5 personnes sur un plan Band. */
export const BAND_PLAN_SEATS = 4;

export interface BandSeatPerson {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  plan: UserPlan;
}

export interface BandSeat {
  id: string;
  status: "pending" | "active";
  /** L'autre personne : l'invite pour le titulaire, le titulaire pour l'invite. */
  person: BandSeatPerson;
}

export interface BandSeatsOverview {
  owned: BandSeat[];
  mySeat: BandSeat | null;
  invitations: BandSeat[];
}

export function seatPersonName(person: Pick<BandSeatPerson, "username" | "display_name">): string {
  return person.display_name || person.username;
}
