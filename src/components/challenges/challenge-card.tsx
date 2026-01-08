"use client";

import { useEffect, useState } from "react";
import type { ChallengeWithDetails } from "@/types";
import { ChallengeProgressBar } from "./challenge-progress-bar";

interface ChallengeCardProps {
  challenge: ChallengeWithDetails;
  isPending?: boolean;
}

const CHALLENGE_TYPE_LABELS: Record<string, string> = {
  practice_time: "Temps de pratique",
  streak: "Streak",
  song_mastery: "Maitrise",
};

const CHALLENGE_TYPE_ICONS: Record<string, React.ReactNode> = {
  practice_time: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  streak: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
    </svg>
  ),
  song_mastery: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export function ChallengeCard({ challenge, isPending }: ChallengeCardProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // Calculer le temps restant
  useEffect(() => {
    if (challenge.status !== "active" || !challenge.ends_at) return;

    const updateTime = () => {
      const now = new Date();
      const end = new Date(challenge.ends_at!);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("Termine");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 0) {
        setTimeRemaining(`${days}j ${hours}h`);
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`${hours}h ${minutes}m`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [challenge.status, challenge.ends_at]);

  const isCompleted = challenge.status === "completed";
  const isWinner = challenge.winner_id !== null;
  const myId = challenge.creator_progress?.user_id || challenge.challenger_progress?.user_id;
  const iAmWinner = challenge.winner_id === myId;

  return (
    <div
      className={`rounded-xl border bg-card p-4 transition-all ${
        isCompleted
          ? iAmWinner
            ? "border-green-500/50"
            : "border-border"
          : "border-border hover:border-primary/50"
      }`}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {CHALLENGE_TYPE_ICONS[challenge.challenge_type]}
          </span>
          <div>
            <span className="text-sm font-medium">
              {CHALLENGE_TYPE_LABELS[challenge.challenge_type]}
            </span>
            {challenge.song_title && (
              <p className="text-xs text-muted-foreground">
                {challenge.song_title} - {challenge.song_artist}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          {isPending ? (
            <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-500">
              En attente
            </span>
          ) : isCompleted ? (
            <span
              className={`rounded-full px-2 py-1 text-xs ${
                iAmWinner
                  ? "bg-green-500/10 text-green-500"
                  : isWinner
                  ? "bg-red-500/10 text-red-500"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {iAmWinner ? "Gagne !" : isWinner ? "Perdu" : "Egalite"}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">{timeRemaining}</span>
          )}
        </div>
      </div>

      {/* Participants */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <ParticipantInfo
          profile={challenge.creator}
          progress={challenge.creator_progress}
          challengeType={challenge.challenge_type}
          isWinner={challenge.winner_id === challenge.creator_id}
          isCompleted={isCompleted}
        />
        <span className="text-xl font-bold text-muted-foreground">VS</span>
        <ParticipantInfo
          profile={challenge.challenger}
          progress={challenge.challenger_progress}
          challengeType={challenge.challenge_type}
          isWinner={challenge.winner_id === challenge.challenger_id}
          isCompleted={isCompleted}
          reverse
        />
      </div>

      {/* Progress bar */}
      {challenge.status === "active" && (
        <ChallengeProgressBar
          challenge={challenge}
          creatorProgress={challenge.creator_progress}
          challengerProgress={challenge.challenger_progress}
        />
      )}
    </div>
  );
}

function ParticipantInfo({
  profile,
  progress,
  challengeType,
  isWinner,
  isCompleted,
  reverse,
}: {
  profile: { display_name?: string; username: string; avatar_url?: string };
  progress: { practice_minutes: number; streak_days: number; song_mastered_at: string | null } | null;
  challengeType: string;
  isWinner: boolean;
  isCompleted: boolean;
  reverse?: boolean;
}) {
  const displayName = profile.display_name || profile.username;

  const getValue = () => {
    if (!progress) return "-";
    if (challengeType === "practice_time") {
      const hours = Math.floor(progress.practice_minutes / 60);
      const mins = progress.practice_minutes % 60;
      return hours > 0 ? `${hours}h${mins}m` : `${mins}m`;
    }
    if (challengeType === "streak") {
      return `${progress.streak_days}j`;
    }
    if (challengeType === "song_mastery") {
      return progress.song_mastered_at ? "Maitrise !" : "En cours";
    }
    return "-";
  };

  return (
    <div className={`flex flex-1 flex-col items-center gap-2 ${reverse ? "items-end" : "items-start"}`}>
      <div className="relative">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={displayName}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            {displayName[0]?.toUpperCase()}
          </div>
        )}
        {isCompleted && isWinner && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-xs">
            👑
          </span>
        )}
      </div>
      <span className="text-sm font-medium">{displayName}</span>
      <span className="text-lg font-bold text-primary">{getValue()}</span>
    </div>
  );
}
