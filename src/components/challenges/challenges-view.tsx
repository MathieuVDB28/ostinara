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
import { Plus } from "lucide-react";

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
      {/*
        Onglets en puces et creation sur une rangee (style Fanzine). Le
        titre « Défis » et sa phrase repetaient la pastille du dessus ; la
        phrase vit desormais dans l'affiche de l'etat vide.
      */}
      <div className="flex items-center gap-1.5">
        {(
          [
            ["challenges", "Mes défis", myChallenges.length, false],
            ["invitations", "Invitations", pendingCount, true],
            ["leaderboard", "Classement", 0, false],
          ] as const
        ).map(([value, label, count, alert]) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            aria-pressed={activeTab === value}
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold transition-colors ${
              activeTab === value ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            {count > 0 && (
              <span
                className={`tabular ${
                  alert ? "rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground" : "opacity-70"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        ))}
        {myChallenges.length > 0 && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            disabled={friends.length === 0}
            className="ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            Défi
          </button>
        )}
      </div>

      {/* Content */}
      {activeTab === "challenges" && (
        <div className="space-y-4">
          {myChallenges.length === 0 && friends.length > 0 ? (
            /*
              L'etat vide en affiche (style Fanzine) : c'est une invitation
              a jouer, pas une erreur. Les trois natures de defi sont
              celles que gere l'app.
            */
            <div className="space-y-4">
              <div className="rounded-[4px] bg-secondary px-5 pb-5 pt-6">
                <p className="font-display text-[52px] font-extrabold uppercase leading-[0.86]">
                  Lance
                  <br />
                  un <span className="text-primary">défi</span>
                  <br />
                  à tes amis
                </p>
                <p className="mt-3 max-w-[32ch] font-serif text-[15px] italic leading-relaxed">
                  Un objectif de pratique sur une période. Celui qui va le plus loin gagne.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {["Minutes jouées", "Morceaux maîtrisés", "Série"].map((kind) => (
                    <span
                      key={kind}
                      className="rounded border border-border px-2 py-1 font-display text-[11px] font-bold uppercase tracking-[0.06em]"
                    >
                      {kind}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-5 inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Plus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  Créer un défi
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Tes sessions de pratique alimentent tes défis toutes seules : rien à cocher en plus.{" "}
                <button onClick={() => setActiveTab("leaderboard")} className="font-semibold text-foreground underline underline-offset-2">
                  Voir le classement
                </button>
              </p>
            </div>
          ) : myChallenges.length === 0 ? (
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
