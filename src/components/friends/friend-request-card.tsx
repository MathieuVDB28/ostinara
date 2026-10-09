"use client";

import Image from "next/image";
import { useState } from "react";
import type { FriendRequest } from "@/types";
import { acceptFriendRequest, rejectFriendRequest } from "@/lib/actions/friends";

interface FriendRequestCardProps {
  request: FriendRequest;
  onRefresh: () => void;
}

export function FriendRequestCard({ request, onRefresh }: FriendRequestCardProps) {
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setLoading("accept");
    setError(null);
    const result = await acceptFriendRequest(request.id);
    if (!result.success) {
      setError(result.error || "Erreur");
    }
    onRefresh();
    setLoading(null);
  };

  const handleReject = async () => {
    setLoading("reject");
    setError(null);
    await rejectFriendRequest(request.id);
    onRefresh();
    setLoading(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div className="border-b border-border py-3">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-xl font-extrabold text-muted-foreground">
          {request.requester.avatar_url ? (
            <Image
              src={request.requester.avatar_url}
              alt={request.requester.username}
              className="h-12 w-12 rounded-full object-cover"
              width={48}
              height={48}
            />
          ) : (
            request.requester.display_name?.[0]?.toUpperCase() ||
            request.requester.username[0].toUpperCase()
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-xl font-extrabold uppercase leading-tight">
            {request.requester.display_name || request.requester.username}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            @{request.requester.username} · {formatDate(request.created_at)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            disabled={loading !== null}
            className="min-h-[36px] rounded-full bg-foreground px-3.5 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading === "accept" ? "..." : "Accepter"}
          </button>
          <button
            onClick={handleReject}
            disabled={loading !== null}
            className="min-h-[36px] rounded-full border border-border px-3.5 text-xs font-semibold transition-colors hover:bg-accent disabled:opacity-50"
          >
            {loading === "reject" ? "..." : "Refuser"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
