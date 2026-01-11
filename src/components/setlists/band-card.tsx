"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { leaveBand, deleteBand, removeBandMember } from "@/lib/actions/bands";
import { getActiveJamSession } from "@/lib/actions/jam-sessions";
import { InviteMemberModal } from "./invite-member-modal";
import { StartJamModal } from "@/components/jam/start-jam-modal";
import type { BandWithMembers, JamSession } from "@/types";

interface BandCardProps {
  band: BandWithMembers;
  currentUserId: string;
  onUpdate: () => void;
}

export function BandCard({ band, currentUserId, onUpdate }: BandCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showJamModal, setShowJamModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeJam, setActiveJam] = useState<JamSession | null>(null);

  const isOwner = band.owner_id === currentUserId;
  const memberCount = band.members.length;

  // Check for active jam session
  useEffect(() => {
    async function checkActiveJam() {
      const session = await getActiveJamSession(band.id);
      setActiveJam(session);
    }
    checkActiveJam();
  }, [band.id]);

  const handleLeave = async () => {
    if (!confirm("Es-tu sur de vouloir quitter ce groupe ?")) return;
    setLoading(true);
    await leaveBand(band.id);
    onUpdate();
  };

  const handleDelete = async () => {
    setLoading(true);
    await deleteBand(band.id);
    onUpdate();
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (
      !confirm(`Es-tu sur de vouloir retirer ${memberName} du groupe ?`)
    )
      return;
    await removeBandMember(band.id, memberId);
    onUpdate();
  };

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-accent/50"
        >
          {/* Band icon */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
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

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-semibold">{band.name}</h3>
              {isOwner && (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                  Admin
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {memberCount} membre{memberCount > 1 ? "s" : ""}
            </p>
          </div>

          {/* Chevron */}
          <svg
            className={`h-5 w-5 text-muted-foreground transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="border-t border-border p-4">
            {/* Description */}
            {band.description && (
              <p className="mb-4 text-sm text-muted-foreground">
                {band.description}
              </p>
            )}

            {/* Members list */}
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-medium">Membres</h4>
              <div className="space-y-2">
                {band.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-lg bg-accent/50 p-2"
                  >
                    {/* Avatar */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                      {member.profile.avatar_url ? (
                        <img
                          src={member.profile.avatar_url}
                          alt=""
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        (
                          member.profile.display_name?.[0] ||
                          member.profile.username[0]
                        ).toUpperCase()
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">
                        {member.profile.display_name || member.profile.username}
                      </p>
                    </div>

                    {/* Role badge */}
                    {member.role === "owner" && (
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                        Owner
                      </span>
                    )}

                    {/* Remove button (only for owner, not self) */}
                    {isOwner && member.user_id !== currentUserId && (
                      <button
                        onClick={() =>
                          handleRemoveMember(
                            member.user_id,
                            member.profile.display_name ||
                              member.profile.username
                          )
                        }
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <svg
                          className="h-4 w-4"
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
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {/* Jam Session button */}
              {activeJam ? (
                <Link
                  href={`/jam/${activeJam.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-green-600"
                >
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  Rejoindre la Jam
                </Link>
              ) : (
                <button
                  onClick={() => setShowJamModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-amber-600"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                  Demarrer Jam
                </button>
              )}

              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Inviter
              </button>

              {isOwner ? (
                confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-destructive">Confirmer ?</span>
                    <button
                      onClick={handleDelete}
                      disabled={loading}
                      className="rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground transition-all hover:opacity-90 disabled:opacity-50"
                    >
                      {loading ? "..." : "Supprimer"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="rounded-lg border border-destructive/50 px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                  >
                    Supprimer le groupe
                  </button>
                )
              ) : (
                <button
                  onClick={handleLeave}
                  disabled={loading}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {loading ? "..." : "Quitter le groupe"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Invite modal */}
      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={onUpdate}
        bandId={band.id}
        bandName={band.name}
      />

      {/* Start Jam modal */}
      <StartJamModal
        isOpen={showJamModal}
        onClose={() => setShowJamModal(false)}
        band={band}
      />
    </>
  );
}
