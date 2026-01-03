"use client";

import { useState, useEffect } from "react";
import { searchUsersForBandInvite, inviteToBand } from "@/lib/actions/bands";
import type { Profile } from "@/types";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bandId: string;
  bandName: string;
}

export function InviteMemberModal({
  isOpen,
  onClose,
  onSuccess,
  bandId,
  bandName,
}: InviteMemberModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Search users with debounce
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      const users = await searchUsersForBandInvite(query, bandId);
      setResults(users);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, bandId]);

  if (!isOpen) return null;

  const handleInvite = async (userId: string, userName: string) => {
    setInviting(userId);
    setError(null);

    const result = await inviteToBand(bandId, userId);

    setInviting(null);

    if (result.success) {
      setSuccessMessage(`Invitation envoyee a ${userName}`);
      // Remove from results
      setResults(results.filter((u) => u.id !== userId));
      setTimeout(() => setSuccessMessage(null), 3000);
      onSuccess();
    } else {
      setError(result.error || "Erreur lors de l'envoi de l'invitation");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Inviter un membre</h2>
            <p className="mt-1 text-sm text-muted-foreground">{bandName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
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
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par username..."
            className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
            autoFocus
          />
        </div>

        {/* Success message */}
        {successMessage && (
          <div className="mb-4 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-400">
            {successMessage}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Results */}
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {searching && (
            <div className="py-8 text-center text-muted-foreground">
              Recherche...
            </div>
          )}

          {!searching && query.length >= 2 && results.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              Aucun utilisateur trouve
            </div>
          )}

          {!searching && query.length < 2 && (
            <div className="py-8 text-center text-muted-foreground">
              Tape au moins 2 caracteres pour rechercher
            </div>
          )}

          {results.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 rounded-lg border border-border p-3"
            >
              {/* Avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  (user.display_name?.[0] || user.username[0]).toUpperCase()
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">
                  {user.display_name || user.username}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  @{user.username}
                </p>
              </div>

              {/* Invite button */}
              <button
                onClick={() =>
                  handleInvite(user.id, user.display_name || user.username)
                }
                disabled={inviting === user.id}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
              >
                {inviting === user.id ? "..." : "Inviter"}
              </button>
            </div>
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
