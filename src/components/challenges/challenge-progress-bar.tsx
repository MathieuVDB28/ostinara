"use client";

import type { ChallengeWithDetails, ChallengeProgress } from "@/types";

interface ChallengeProgressBarProps {
  challenge: ChallengeWithDetails;
  creatorProgress: ChallengeProgress | null;
  challengerProgress: ChallengeProgress | null;
}

export function ChallengeProgressBar({
  challenge,
  creatorProgress,
  challengerProgress,
}: ChallengeProgressBarProps) {
  const getProgressValues = () => {
    if (!creatorProgress || !challengerProgress) {
      return { creator: 0, challenger: 0, total: 1 };
    }

    let creator = 0;
    let challenger = 0;

    switch (challenge.challenge_type) {
      case "practice_time":
        creator = creatorProgress.practice_minutes;
        challenger = challengerProgress.practice_minutes;
        break;
      case "streak":
        creator = creatorProgress.streak_days;
        challenger = challengerProgress.streak_days;
        break;
      case "song_mastery":
        creator = creatorProgress.song_mastered_at ? 1 : 0;
        challenger = challengerProgress.song_mastered_at ? 1 : 0;
        break;
    }

    const total = Math.max(creator + challenger, 1);
    return { creator, challenger, total };
  };

  const { creator, challenger, total } = getProgressValues();
  const creatorPercent = Math.round((creator / total) * 100);
  const challengerPercent = Math.round((challenger / total) * 100);

  // Pour song_mastery, afficher différemment
  if (challenge.challenge_type === "song_mastery") {
    return (
      <div className="flex items-center gap-4">
        <div className="flex flex-1 items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${
              creatorProgress?.song_mastered_at ? "bg-green-500" : "bg-muted"
            }`}
          />
          <span className="text-xs text-muted-foreground">
            {creatorProgress?.song_mastered_at ? "Maitrise !" : "En cours"}
          </span>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          <span className="text-xs text-muted-foreground">
            {challengerProgress?.song_mastered_at ? "Maitrise !" : "En cours"}
          </span>
          <div
            className={`h-3 w-3 rounded-full ${
              challengerProgress?.song_mastered_at ? "bg-green-500" : "bg-muted"
            }`}
          />
        </div>
      </div>
    );
  }

  // Pour practice_time et streak, afficher une barre de progression comparative
  return (
    <div className="space-y-2">
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        {creatorPercent > 0 && (
          <div
            className="bg-primary transition-all duration-500"
            style={{ width: `${creatorPercent}%` }}
          />
        )}
        {challengerPercent > 0 && (
          <div
            className="bg-blue-500 transition-all duration-500"
            style={{ width: `${challengerPercent}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-primary" />
          {challenge.creator.display_name || challenge.creator.username}
        </span>
        <span className="flex items-center gap-1">
          {challenge.challenger.display_name || challenge.challenger.username}
          <span className="h-2 w-2 rounded-full bg-blue-500" />
        </span>
      </div>
    </div>
  );
}
