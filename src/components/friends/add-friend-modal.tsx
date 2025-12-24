"use client";

import { useState, useEffect, useCallback } from "react";
import { searchUsers, sendFriendRequest } from "@/lib/actions/friends";
import type { UserSearchResult } from "@/types";

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddFriendModal({ isOpen, onClose, onSuccess }: AddFriendModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const users = await searchUsers(query);
      setResults(users);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSendRequest = async (userId: string, username: string) => {
    setSending(userId);
    setError(null);
    setSuccessMessage(null);

    const result = await sendFriendRequest(userId);

    if (result.success) {
      setSuccessMessage(`Demande envoyee a @${username}`);
      // Update local state
      setResults((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, friendshipStatus: "pending" as const } : u
        )
      );
      onSuccess();
    } else {
      setError(result.error || "Erreur");
    }

    setSending(null);
  };

  const handleClose = useCallback(() => {
    setQuery("");
    setResults([]);
    setError(null);
    setSuccessMessage(null);
    onClose();
  }, [onClose]);

  // Escape key and body scroll lock
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const getStatusLabel = (status: UserSearchResult["friendshipStatus"]) => {
    switch (status) {
      case "self":
        return { text: "Toi", disabled: true };
      case "accepted":
        return { text: "Ami", disabled: true };
      case "pending":
        return { text: "En attente", disabled: true };
      case "blocked":
        return { text: "Bloque", disabled: true };
      default:
        return { text: "Ajouter", disabled: false };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Ajouter un ami</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search input */}
        <div className="relative mb-4">
          <svg
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par nom d'utilisateur..."
            className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-400">
            {successMessage}
          </div>
        )}

        {/* Results */}
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {results.map((user) => {
            const status = getStatusLabel(user.friendshipStatus);
            return (
              <div
                key={user.id}
                className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent"
              >
                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    user.display_name?.[0]?.toUpperCase() || user.username[0].toUpperCase()
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {user.display_name || user.username}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    @{user.username}
                  </div>
                </div>

                {/* Action button */}
                <button
                  onClick={() => handleSendRequest(user.id, user.username)}
                  disabled={status.disabled || sending === user.id}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    status.disabled
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary text-primary-foreground hover:opacity-90"
                  } disabled:opacity-50`}
                >
                  {sending === user.id ? "..." : status.text}
                </button>
              </div>
            );
          })}

          {query && !loading && results.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              Aucun utilisateur trouve
            </div>
          )}

          {!query && (
            <div className="py-8 text-center text-muted-foreground">
              Recherche un utilisateur par son nom
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
