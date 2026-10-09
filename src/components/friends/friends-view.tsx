"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { FriendCard } from "./friend-card";
import { FriendRequestCard } from "./friend-request-card";
import { AddFriendModal } from "./add-friend-modal";
import { PublicProfileModal } from "@/components/profile/public-profile-modal";
import type { Friend, FriendRequest } from "@/types";

interface FriendsViewProps {
  initialFriends: Friend[];
  initialRequests: FriendRequest[];
  limitInfo?: {
    isLimited: boolean;
    current: number;
    limit: number;
  } | null;
  /** Profil a ouvrir a l'arrivee — lien profond de la recherche globale. */
  initialFriendId?: string;
}

type Tab = "friends" | "requests";

export function FriendsView({
  initialFriends,
  initialRequests,
  limitInfo,
  initialFriendId,
}: FriendsViewProps) {
  const router = useRouter();
  const [friends, setFriends] = useState(initialFriends);
  const [requests, setRequests] = useState(initialRequests);
  const [activeTab, setActiveTab] = useState<Tab>("friends");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // Arrivee depuis la recherche globale : le profil s'ouvre des le premier
  // rendu.
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(
    initialFriendId ?? null
  );
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(
    Boolean(initialFriendId)
  );

  useEffect(() => {
    setFriends(initialFriends);
    setRequests(initialRequests);
  }, [initialFriends, initialRequests]);

  const handleRefresh = () => {
    router.refresh();
  };

  const handleViewProfile = (friendId: string) => {
    setSelectedFriendId(friendId);
    setIsProfileModalOpen(true);
  };

  const handleCloseProfile = () => {
    setIsProfileModalOpen(false);
    setSelectedFriendId(null);
  };

  const handleCloseProfileModal = () => {
    setIsProfileModalOpen(false);
    setSelectedFriendId(null);
  };

  return (
    <div>
      {/*
        Onglets en puces et ajout sur une rangee (style Fanzine). Le titre
        « Mes amis » repetait la pastille juste au-dessus.
      */}
      <div className="mb-2 flex items-center gap-1.5">
        {(
          [
            ["friends", "Amis", friends.length],
            ["requests", "Demandes", requests.length],
          ] as const
        ).map(([value, label, count]) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            aria-pressed={activeTab === value}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold transition-colors ${
              activeTab === value ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            {count > 0 && (
              <span
                className={`tabular ${
                  value === "requests" ? "rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground" : "opacity-70"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        ))}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <UserPlus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Ajouter
        </button>
      </div>

      {limitInfo && (
        <p className="tabular mb-2 text-xs text-muted-foreground">
          {limitInfo.current}/{limitInfo.limit} amis avec ton plan
        </p>
      )}

      {/* Content based on active tab */}
      {activeTab === "friends" ? (
        friends.length > 0 ? (
          <div className="max-w-2xl">
            {friends.map((friend) => (
              <FriendCard
                key={friend.id}
                friend={friend}
                onViewProfile={() => handleViewProfile(friend.profile.id)}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            type="friends"
            onAction={() => setIsAddModalOpen(true)}
          />
        )
      ) : requests.length > 0 ? (
        <div className="max-w-2xl">
          {requests.map((request) => (
            <FriendRequestCard
              key={request.id}
              request={request}
              onRefresh={handleRefresh}
            />
          ))}
        </div>
      ) : (
        <EmptyState type="requests" />
      )}

      {/* Modals */}
      <AddFriendModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleRefresh}
      />

      <PublicProfileModal
        userId={selectedFriendId || ""}
        isOpen={isProfileModalOpen}
        onClose={handleCloseProfile}
      />
    </div>
  );
}

function EmptyState({
  type,
  onAction,
}: {
  type: "friends" | "requests";
  onAction?: () => void;
}) {
  const config = {
    friends: {
      title: "Aucun ami pour le moment",
      description: "Ajoute des amis pour voir leurs morceaux et leurs covers.",
      actionLabel: "Ajouter un ami",
    },
    requests: {
      title: "Aucune demande en attente",
      description: "Les demandes d'amis que tu reçois apparaîtront ici.",
      actionLabel: undefined as string | undefined,
    },
  };

  const { title, description, actionLabel } = config[type];

  return (
    <div className="flex flex-col items-center py-16 text-center">
      <p className="font-display text-3xl font-extrabold uppercase leading-[0.95]">{title}</p>
      <p className="mb-6 mt-2 max-w-sm font-serif italic text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="min-h-[44px] rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
