"use client";

import { useState } from "react";
import { UserMinus } from "lucide-react";
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

  const name = friend.profile.display_name || friend.profile.username;

  /*
   * Une ligne par ami (style Fanzine, docs/refonte-ui.md) : l'avatar,
   * le nom en condense, depuis quand. « Voir le profil » est l'action ;
   * la suppression reste a portee, mais en icone, pas en bouton jumeau.
   */
  return (
    <div className="flex items-center gap-3 border-b border-border py-3">
      {friend.profile.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={friend.profile.avatar_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-xl font-extrabold text-muted-foreground"
        >
          {name[0]?.toUpperCase()}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          <span className="truncate font-display text-xl font-extrabold uppercase leading-tight">{name}</span>
          {friend.profile.plan !== "free" && (
            <span className="shrink-0 rounded bg-primary px-1.5 py-px font-display text-[10px] font-bold tracking-[0.08em] text-primary-foreground">
              {friend.profile.plan.toUpperCase()}
            </span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          @{friend.profile.username} · ami depuis le {formatDate(friend.since)}
        </p>
      </div>

      <button
        onClick={onViewProfile}
        className="min-h-[36px] shrink-0 rounded-full border border-border px-3.5 text-xs font-semibold transition-colors hover:bg-accent"
      >
        Profil
      </button>
      <button
        onClick={handleRemove}
        disabled={removing}
        aria-label={`Retirer ${name} de tes amis`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-destructive disabled:opacity-50"
      >
        <UserMinus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}
