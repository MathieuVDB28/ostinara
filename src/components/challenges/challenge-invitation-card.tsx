"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ChallengeWithDetails } from "@/types";
import { acceptChallenge, declineChallenge } from "@/lib/actions/challenges";

interface ChallengeInvitationCardProps {
  challenge: ChallengeWithDetails;
}


export function ChallengeInvitationCard({ challenge }: ChallengeInvitationCardProps) {
  const t = useTranslations("challenges");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setIsLoading(true);
    setError(null);

    const result = await acceptChallenge(challenge.id);

    if (!result.success) {
      setError(result.error || tc("genericError"));
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
      setError(result.error || tc("genericError"));
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
          <Image
            src={challenge.creator.avatar_url}
            alt={creatorName}
            className="h-12 w-12 rounded-full object-cover"
            width={48}
            height={48}
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-lg font-semibold text-muted-foreground">
            {creatorName[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-medium">{creatorName}</p>
          <p className="text-sm text-muted-foreground">{t("invitation.invites")}</p>
        </div>
      </div>

      {/* Détails du défi */}
      <div className="mb-4 space-y-2 rounded-lg bg-muted/50 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t("invitation.type")}</span>
          <span className="text-sm font-medium">
            {t(`typeLong.${challenge.challenge_type}`)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t("invitation.duration")}</span>
          <span className="text-sm font-medium">{t("invitation.days", { count: challenge.duration_days })}</span>
        </div>
        {challenge.song_title && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("invitation.song")}</span>
            <span className="text-sm font-medium">
              {challenge.song_title} - {challenge.song_artist}
            </span>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {t(`typeDescription.${challenge.challenge_type}`)}
        </p>
      </div>

      {/* Erreur */}
      {error && (
        <p className="mb-4 text-sm text-destructive">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleDecline}
          disabled={isLoading}
          className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          {tc("decline")}
        </button>
        <button
          onClick={handleAccept}
          disabled={isLoading}
          className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? "..." : tc("accept")}
        </button>
      </div>
    </div>
  );
}
