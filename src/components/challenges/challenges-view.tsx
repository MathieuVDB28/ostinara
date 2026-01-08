"use client";

import { useState } from "react";
import type {
  ChallengeWithDetails,
  LeaderboardEntry,
  Friend,
  Song,
} from "@/types";
import { ChallengeCard } from "./challenge-card";
import { ChallengeInvitationCard } from "./challenge-invitation-card";
import { CreateChallengeModal } from "./create-challenge-modal";
import { LeaderboardView } from "./leaderboard-view";

interface ChallengesViewProps {
  initialChallenges: ChallengeWithDetails[];
  initialLeaderboard: LeaderboardEntry[];
  pendingCount: number;
  friends: Friend[];
  songs: Song[];
}

type Tab = "challenges" | "invitations" | "leaderboard";

export function ChallengesView({
  initialChallenges,
  initialLeaderboard,
  pendingCount,
  friends,
  songs,
}: ChallengesViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("challenges");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Séparer les challenges par type
  const myChallenges = initialChallenges.filter(
    (c) => c.status === "active" || c.status === "completed"
  );
  const pendingInvitations = initialChallenges.filter(
    (c) =>
      c.status === "pending" &&
      c.challenger.id !== c.creator_id // Je suis le challenger (invité)
  );
  const sentInvitations = initialChallenges.filter(
    (c) =>
      c.status === "pending" &&
      c.creator.id !== c.challenger_id // Je suis le créateur
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Defis</h1>
          <p className="text-muted-foreground">
            Lance des defis à tes amis et grimpe dans le classement
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          disabled={friends.length === 0}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Nouveau defi
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("challenges")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "challenges"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Mes defis
          {myChallenges.length > 0 && (
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
              {myChallenges.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("invitations")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "invitations"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Invitations
          {pendingCount > 0 && (
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "leaderboard"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Classement
        </button>
      </div>

      {/* Content */}
      {activeTab === "challenges" && (
        <div className="space-y-4">
          {myChallenges.length === 0 ? (
            <EmptyState
              title="Aucun defi en cours"
              description="Lance un defi a un ami pour commencer !"
              actionLabel={friends.length > 0 ? "Creer un defi" : undefined}
              onAction={() => setIsCreateModalOpen(true)}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {myChallenges.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          )}

          {/* Défis envoyés en attente */}
          {sentInvitations.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-4 text-lg font-semibold text-muted-foreground">
                Defis envoyes en attente
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {sentInvitations.map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    isPending
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "invitations" && (
        <div className="space-y-4">
          {pendingInvitations.length === 0 ? (
            <EmptyState
              title="Aucune invitation"
              description="Tu n'as pas de demande de defi en attente"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {pendingInvitations.map((challenge) => (
                <ChallengeInvitationCard
                  key={challenge.id}
                  challenge={challenge}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "leaderboard" && (
        <LeaderboardView initialLeaderboard={initialLeaderboard} />
      )}

      {/* Modal création */}
      <CreateChallengeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        friends={friends}
        songs={songs}
      />
    </div>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <svg
          className="h-8 w-8 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M6 4h12v2a6 6 0 01-12 0V4z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 16h6v4H9z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 12v4"
          />
        </svg>
      </div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
