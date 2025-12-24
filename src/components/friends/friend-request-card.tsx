"use client";

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
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
          {request.requester.avatar_url ? (
            <img
              src={request.requester.avatar_url}
              alt={request.requester.username}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            request.requester.display_name?.[0]?.toUpperCase() ||
            request.requester.username[0].toUpperCase()
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">
            {request.requester.display_name || request.requester.username}
          </div>
          <div className="text-sm text-muted-foreground">
            @{request.requester.username} · {formatDate(request.created_at)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            disabled={loading !== null}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
          >
            {loading === "accept" ? "..." : "Accepter"}
          </button>
          <button
            onClick={handleReject}
            disabled={loading !== null}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
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
