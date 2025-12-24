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
    <div className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
          {friend.profile.avatar_url ? (
            <img
              src={friend.profile.avatar_url}
              alt={friend.profile.username}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            friend.profile.display_name?.[0]?.toUpperCase() ||
            friend.profile.username[0].toUpperCase()
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">
            {friend.profile.display_name || friend.profile.username}
          </div>
          <div className="truncate text-sm text-muted-foreground">
            @{friend.profile.username}
          </div>
        </div>

        {/* Plan badge */}
        {friend.profile.plan !== "free" && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {friend.profile.plan.toUpperCase()}
          </span>
        )}
      </div>

      {/* Since date */}
      <div className="mt-3 text-xs text-muted-foreground">
        Ami depuis le {formatDate(friend.since)}
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={onViewProfile}
          className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium transition-colors hover:bg-accent/80"
        >
          Voir le profil
        </button>
        <button
          onClick={handleRemove}
          disabled={removing}
          className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-50"
        >
          {removing ? "..." : "Supprimer"}
        </button>
      </div>
    </div>
  );
}
