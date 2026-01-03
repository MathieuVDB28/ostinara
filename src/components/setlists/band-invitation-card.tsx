"use client";

import { useState } from "react";
import {
  acceptBandInvitation,
  declineBandInvitation,
} from "@/lib/actions/bands";
import type { BandInvitationWithDetails } from "@/types";

interface BandInvitationCardProps {
  invitation: BandInvitationWithDetails;
  onAction: () => void;
}

export function BandInvitationCard({
  invitation,
  onAction,
}: BandInvitationCardProps) {
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);

  const handleAccept = async () => {
    setLoading("accept");
    await acceptBandInvitation(invitation.id);
    onAction();
  };

  const handleDecline = async () => {
    setLoading("decline");
    await declineBandInvitation(invitation.id);
    onAction();
  };

  return (
    <div className="flex items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
      {/* Band icon */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium">
          <span className="text-primary">
            {invitation.inviter.display_name || invitation.inviter.username}
          </span>{" "}
          t&apos;invite a rejoindre{" "}
          <span className="font-semibold">{invitation.band.name}</span>
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {new Date(invitation.created_at).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleDecline}
          disabled={loading !== null}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          {loading === "decline" ? "..." : "Refuser"}
        </button>
        <button
          onClick={handleAccept}
          disabled={loading !== null}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
        >
          {loading === "accept" ? "..." : "Accepter"}
        </button>
      </div>
    </div>
  );
}
