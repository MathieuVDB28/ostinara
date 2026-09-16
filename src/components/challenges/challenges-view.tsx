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
import { EmptyState } from "@/components/ui/empty-state";

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
          <h1 className="text-2xl font-bold">Défis</h1>
          <p className="text-muted-foreground">
            Lance des défis à tes amis et grimpe dans le classement
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
      <div className="flex gap-6 border-b border-border">
        <button
          onClick={() => setActiveTab("challenges")}
          className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
            activeTab === "challenges"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Mes défis
          {myChallenges.length > 0 && (
            <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
              {myChallenges.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("invitations")}
          className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
            activeTab === "invitations"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
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
          className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
            activeTab === "leaderboard"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Classement
        </button>
      </div>

      {/* Content */}
      {activeTab === "challenges" && (
        <div className="space-y-4">
          {myChallenges.length === 0 ? (
            /*
              Un defi se joue a deux : sans ami, le bouton « Creer » ne
              mene nulle part. L'etat vide propose alors l'etape d'avant
              plutot qu'une action fermee sans explication.
            */
            <EmptyState
              icon="emoji_events"
              title="Aucun défi en cours"
              description={
                friends.length > 0
                  ? "Un défi, c'est un objectif de pratique sur une période : minutes jouées, morceaux maîtrisés, tempo atteint. Celui qui va le plus loin gagne."
                  : "Un défi se joue à deux. Ajoute un ami, et vous pourrez vous fixer un objectif de pratique commun."
              }
              actions={
                friends.length > 0
                  ? [
                      {
                        label: "Créer un défi",
                        icon: "add",
                        primary: true,
                        onClick: () => setIsCreateModalOpen(true),
                      },
                      {
                        label: "Voir le classement",
                        icon: "leaderboard",
                        onClick: () => setActiveTab("leaderboard"),
                      },
                    ]
                  : [
                      {
                        label: "Ajouter un ami",
                        icon: "person_add",
                        primary: true,
                        href: "/commu/amis",
                      },
                      {
                        label: "Créer un défi",
                        icon: "add",
                        disabled: true,
                        disabledReason: "Il faut au moins un ami",
                      },
                    ]
              }
              hint="Tes sessions de pratique alimentent tes défis toutes seules : rien à cocher en plus."
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
                Défis envoyés en attente
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
              icon="emoji_events"
              title="Aucune invitation"
              description="Personne ne t'a défié pour l'instant. Rien n'empêche de commencer."
              actions={[
                {
                  label: "Lancer un défi",
                  icon: "add",
                  primary: true,
                  disabled: friends.length === 0,
                  disabledReason:
                    friends.length === 0 ? "Il faut au moins un ami" : undefined,
                  onClick: () => setIsCreateModalOpen(true),
                },
                {
                  label: "Voir mes défis",
                  icon: "emoji_events",
                  onClick: () => setActiveTab("challenges"),
                },
              ]}
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
