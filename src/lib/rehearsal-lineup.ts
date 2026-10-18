import { bandLineup, type LineupPoste } from "@/lib/instruments";
import type { BandMember, RehearsalParticipant, RehearsalRsvpStatus } from "@/types";

type PosteMember = Pick<BandMember, "user_id" | "instrument" | "instrument_label">;

export interface RehearsalPoste extends LineupPoste<PosteMember> {
  /**
   * Ou en est le poste : confirme des qu'un membre qui le tient vient,
   * « personne » quand tous ont dit non.
   */
  state: RehearsalRsvpStatus;
}

/**
 * Le line-up d'une repete : pour chaque poste du groupe, qui vient.
 * C'est la question qu'on se pose vraiment (« on a un batteur ? »), le
 * total de oui ne la tranche pas.
 */
export function rehearsalLineup(
  members: PosteMember[],
  participants: Pick<RehearsalParticipant, "user_id" | "status">[]
): RehearsalPoste[] {
  return bandLineup(members).map((poste) => {
    const statuses = poste.members.map(
      (member) => participants.find((p) => p.user_id === member.user_id)?.status ?? "invited"
    );
    const state: RehearsalRsvpStatus = statuses.includes("accepted")
      ? "accepted"
      : statuses.includes("maybe")
        ? "maybe"
        : statuses.every((status) => status === "declined")
          ? "declined"
          : "invited";
    return { ...poste, state };
  });
}
