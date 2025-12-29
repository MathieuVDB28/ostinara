"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FriendCard } from "./friend-card";
import { FriendRequestCard } from "./friend-request-card";
import { AddFriendModal } from "./add-friend-modal";
import { FriendProfileModal } from "./friend-profile-modal";
import type { Friend, FriendRequest, FriendProfile } from "@/types";
import { getFriendProfile } from "@/lib/actions/friends";

interface FriendsViewProps {
  initialFriends: Friend[];
  initialRequests: FriendRequest[];
  limitInfo?: {
    isLimited: boolean;
    current: number;
    limit: number;
  } | null;
}

type Tab = "friends" | "requests";

export function FriendsView({
  initialFriends,
  initialRequests,
  limitInfo,
}: FriendsViewProps) {
  const router = useRouter();
  const [friends, setFriends] = useState(initialFriends);
  const [requests, setRequests] = useState(initialRequests);
  const [activeTab, setActiveTab] = useState<Tab>("friends");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedFriendProfile, setSelectedFriendProfile] = useState<FriendProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    setFriends(initialFriends);
    setRequests(initialRequests);
  }, [initialFriends, initialRequests]);

  const handleRefresh = () => {
    router.refresh();
  };

  const handleViewProfile = async (friendId: string) => {
    setLoadingProfile(true);
    setIsProfileModalOpen(true);
    const profile = await getFriendProfile(friendId);
    setSelectedFriendProfile(profile);
    setLoadingProfile(false);
  };

  const handleCloseProfileModal = () => {
    setIsProfileModalOpen(false);
    setSelectedFriendProfile(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mes amis</h1>
          <p className="mt-1 text-muted-foreground">
            {friends.length} ami{friends.length !== 1 ? "s" : ""}
            {limitInfo && (
              <span className="ml-2 text-xs">
                ({limitInfo.current}/{limitInfo.limit} utilises)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-all hover:opacity-90"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter un ami
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab("friends")}
          className={`whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "friends"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Amis ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`relative whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "requests"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Demandes
          {requests.length > 0 && (
            <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
              {requests.length}
            </span>
          )}
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === "friends" ? (
        friends.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="space-y-3">
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

      <FriendProfileModal
        friendProfile={selectedFriendProfile}
        isOpen={isProfileModalOpen}
        onClose={handleCloseProfileModal}
        loading={loadingProfile}
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
      icon: (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
      title: "Aucun ami pour le moment",
      description: "Ajoute des amis pour voir leurs morceaux et covers",
      actionLabel: "Ajouter un ami",
    },
    requests: {
      icon: (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
        </svg>
      ),
      title: "Aucune demande en attente",
      description: "Les demandes d'amis que tu recois apparaitront ici",
      actionLabel: undefined as string | undefined,
    },
  };

  const { icon, title, description, actionLabel } = config[type];

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="mb-6 max-w-sm text-center text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
