"use client";

import { useState } from "react";
import type { Friend } from "@/types";
import { removeFriend } from "@/lib/actions/friends";

interface FriendCardProps {
  friend: Friend;
  onViewProfile: () => void;
  onRefresh: () => void;
}

export function FriendCard({ friend, onViewProfile, onRefresh }: FriendCardProps) {
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    if (!confirm("Supprimer cet ami ?")) return;
    setRemoving(true);
    await removeFriend(friend.id);
    onRefresh();
    setRemoving(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/40">
      {/* Cover image / gradient header */}
      <div className="relative h-32 overflow-hidden">
        {friend.profile.avatar_url ? (
          <img
            src={friend.profile.avatar_url}
            alt={friend.profile.username}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-primary/70">
            <span className="text-4xl font-bold text-white">
              {(friend.profile.display_name?.[0] || friend.profile.username[0]).toUpperCase()}
            </span>
          </div>
        )}
        {/* Plan badge */}
        {friend.profile.plan !== "free" && (
          <span className="absolute right-3 top-3 rounded-full bg-primary/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            {friend.profile.plan.toUpperCase()}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-5">
        <h3 className="truncate text-lg font-semibold">
          {friend.profile.display_name || friend.profile.username}
        </h3>
        <p className="mt-0.5 truncate text-sm text-primary">
          @{friend.profile.username}
        </p>

        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
          Ami depuis le {formatDate(friend.since)}
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onViewProfile}
            className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Voir le profil
          </button>
          <button
            onClick={handleRemove}
            disabled={removing}
            className="flex-1 rounded-lg border border-border py-2 text-sm text-muted-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-50"
          >
            {removing ? "..." : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}
