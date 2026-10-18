"use client";

import { useState } from "react";
import Link from "next/link";
import { profileHref } from "@/lib/navigation";
import { UserMinus } from "lucide-react";
import type { Friend } from "@/types";
import { removeFriend } from "@/lib/actions/friends";
import { instrumentLabel } from "@/lib/instruments";

interface FriendCardProps {
  friend: Friend;
  onRefresh: () => void;
}

export function FriendCard({ friend, onRefresh }: FriendCardProps) {
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
  const primary = friend.profile.instruments?.find((i) => i.is_primary);

  /*
   * Une ligne par ami (style Fanzine, docs/refonte-ui.md) : l'avatar,
   * le nom en condense, depuis quand. Toute la ligne mene au profil ;
   * la suppression reste a portee, mais en icone, pas en bouton jumeau.
   */
  return (
    <div className="flex items-center gap-3 border-b border-border py-3">
      <Link
        href={profileHref(friend.profile.username)}
        className="-my-3 flex min-w-0 flex-1 items-center gap-3 py-3 transition-colors hover:bg-accent/50"
      >
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
          @{friend.profile.username}
          {primary && ` · ${instrumentLabel(primary)}`} · ami depuis le {formatDate(friend.since)}
        </p>
      </div>
      </Link>
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
