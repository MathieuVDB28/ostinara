"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, UserPlus } from "lucide-react";
import {
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  sendFriendRequest,
} from "@/lib/actions/friends";
import type { PublicProfile } from "@/types";

const OUTLINE =
  "inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-[13px] font-semibold transition-colors hover:bg-accent disabled:opacity-50";
const SOLID =
  "inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50";

interface FriendshipButtonProps {
  userId: string;
  status: PublicProfile["friendship_status"];
  friendshipId: string | null;
  requestIncoming: boolean;
}

/**
 * L'amitie, a l'endroit ou l'on regarde quelqu'un : ajouter, accepter sa
 * demande, ou le retirer.
 *
 * Le bouton « Envoyer une demande d'ami » de l'ancienne modale ne faisait
 * rien. Chaque etat a ici son geste ; « Retirer » demande confirmation
 * parce qu'il n'y a pas de retour arriere.
 */
export function FriendshipButton({ userId, status, friendshipId, requestIncoming }: FriendshipButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = (action: () => Promise<{ success: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setConfirmRemove(false);
        router.refresh();
      } else {
        setError(result.error || "Ça n'a pas marché. Réessaie.");
      }
    });
  };

  if (status === "self" || status === "blocked") return null;

  let content: React.ReactNode;

  if (status === "accepted" && friendshipId) {
    content = confirmRemove ? (
      <span className="flex items-center gap-1.5">
        <button type="button" disabled={pending} onClick={() => run(() => removeFriend(friendshipId))} className={`${OUTLINE} text-destructive`}>
          Retirer
        </button>
        <button type="button" onClick={() => setConfirmRemove(false)} className={OUTLINE}>
          Annuler
        </button>
      </span>
    ) : (
      <button type="button" onClick={() => setConfirmRemove(true)} className={OUTLINE} aria-label="Ami·e — retirer des amis">
        <Check className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
        Ami·e
      </button>
    );
  } else if (status === "pending" && friendshipId && requestIncoming) {
    content = (
      <span className="flex items-center gap-1.5">
        <button type="button" disabled={pending} onClick={() => run(() => acceptFriendRequest(friendshipId))} className={SOLID}>
          Accepter
        </button>
        <button type="button" disabled={pending} onClick={() => run(() => rejectFriendRequest(friendshipId))} className={OUTLINE}>
          Refuser
        </button>
      </span>
    );
  } else if (status === "pending") {
    content = (
      <span className={`${OUTLINE} cursor-default text-muted-foreground hover:bg-background`}>
        <Clock className="h-4 w-4" aria-hidden="true" />
        Demande envoyée
      </span>
    );
  } else {
    content = (
      <button type="button" disabled={pending} onClick={() => run(() => sendFriendRequest(userId))} className={SOLID}>
        <UserPlus className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
        Ajouter
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {content}
      {error && (
        <p role="status" className="max-w-[16rem] text-right text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
