"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("challenges.view");
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
            ["challenges", t("mine"), myChallenges.length, false],
            ["invitations", t("invitations"), pendingCount, true],
            ["leaderboard", t("leaderboard"), 0, false],
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
            {t("new")}
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
                  {t.rich("poster", {
                    br: () => <br />,
                    accent: (chunks) => <span className="text-primary">{chunks}</span>,
                  })}
                </p>
                <p className="mt-3 max-w-[32ch] font-serif text-[15px] italic leading-relaxed">
                  {t("posterHint")}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[t("kindMinutes"), t("kindMastered"), t("kindStreak")].map((kind) => (
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
                  {t("create")}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("autoHint")}{" "}
                <button onClick={() => setActiveTab("leaderboard")} className="font-semibold text-foreground underline underline-offset-2">
                  {t("seeLeaderboard")}
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
              title={t("noneTitle")}
              description={
                friends.length > 0
                  ? t("noneWithFriends")
                  : t("noneNoFriends")
              }
              actions={
                friends.length > 0
                  ? [
                      {
                        label: t("create"),
                        icon: "add",
                        primary: true,
                        onClick: () => setIsCreateModalOpen(true),
                      },
                      {
                        label: t("seeLeaderboard"),
                        icon: "leaderboard",
                        onClick: () => setActiveTab("leaderboard"),
                      },
                    ]
                  : [
                      {
                        label: t("addFriend"),
                        icon: "person_add",
                        primary: true,
                        href: "/commu/amis",
                      },
                      {
                        label: t("create"),
                        icon: "add",
                        disabled: true,
                        disabledReason: t("needFriend"),
                      },
                    ]
              }
              hint={t("autoHint")}
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
                {t("sentPending")}
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
              title={t("noInvitation")}
              description={t("noInvitationHint")}
              actions={[
                {
                  label: t("launch"),
                  icon: "add",
                  primary: true,
                  disabled: friends.length === 0,
                  disabledReason:
                    friends.length === 0 ? t("needFriend") : undefined,
                  onClick: () => setIsCreateModalOpen(true),
                },
                {
                  label: t("seeMine"),
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
