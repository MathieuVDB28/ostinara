"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ChallengeWithDetails } from "@/types";
import { acceptChallenge, declineChallenge } from "@/lib/actions/challenges";

interface ChallengeInvitationCardProps {
  challenge: ChallengeWithDetails;
}

const CHALLENGE_TYPE_LABELS: Record<string, string> = {
  practice_time: "Temps de pratique",
  streak: "Streak de jours",
  song_mastery: "Maitrise de morceau",
};

const CHALLENGE_TYPE_DESCRIPTIONS: Record<string, string> = {
  practice_time: "Celui qui pratique le plus de minutes gagne",
  streak: "Celui qui maintient le plus long streak de jours gagne",
  song_mastery: "Le premier a maitriser le morceau gagne",
};

export function ChallengeInvitationCard({ challenge }: ChallengeInvitationCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setIsLoading(true);
    setError(null);

    const result = await acceptChallenge(challenge.id);

    if (!result.success) {
      setError(result.error || "Erreur lors de l'acceptation");
      setIsLoading(false);
      return;
    }

    router.refresh();
  };

  const handleDecline = async () => {
    setIsLoading(true);
    setError(null);

    const result = await declineChallenge(challenge.id);

    if (!result.success) {
      setError(result.error || "Erreur lors du refus");
      setIsLoading(false);
      return;
    }

    router.refresh();
  };

  const creatorName = challenge.creator.display_name || challenge.creator.username;

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50">
      {/* Header avec avatar */}
      <div className="mb-4 flex items-center gap-3">
        {challenge.creator.avatar_url ? (
          <img
            src={challenge.creator.avatar_url}
            alt={creatorName}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            {creatorName[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-medium">{creatorName}</p>
          <p className="text-sm text-muted-foreground">t'invite a un defi</p>
        </div>
      </div>

      {/* Détails du défi */}
      <div className="mb-4 space-y-2 rounded-lg bg-muted/50 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Type</span>
          <span className="text-sm font-medium">
            {CHALLENGE_TYPE_LABELS[challenge.challenge_type]}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Duree</span>
          <span className="text-sm font-medium">{challenge.duration_days} jours</span>
        </div>
        {challenge.song_title && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Morceau</span>
            <span className="text-sm font-medium">
              {challenge.song_title} - {challenge.song_artist}
            </span>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {CHALLENGE_TYPE_DESCRIPTIONS[challenge.challenge_type]}
        </p>
      </div>

      {/* Erreur */}
      {error && (
        <p className="mb-4 text-sm text-red-500">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleDecline}
          disabled={isLoading}
          className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          Refuser
        </button>
        <button
          onClick={handleAccept}
          disabled={isLoading}
          className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? "..." : "Accepter"}
        </button>
      </div>
    </div>
  );
}
