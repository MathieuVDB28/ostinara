"use client";

import { useState } from "react";
import Link from "next/link";
import {
  respondToRehearsal,
  updateRehearsal,
  cancelRehearsal,
  completeRehearsal,
  deleteRehearsal,
} from "@/lib/actions/rehearsals";
import { BandChatPanel } from "./band-chat-panel";
import { RSVP_COLORS, RSVP_LABELS, RECURRENCE_LABELS } from "@/types";
import type {
  RehearsalWithDetails,
  RehearsalRsvpStatus,
  BandMessageWithProfile,
} from "@/types";

interface RehearsalDetailViewProps {
  rehearsal: RehearsalWithDetails;
  currentUserId: string;
  messages: BandMessageWithProfile[];
}

export function RehearsalDetailView({
  rehearsal: initialRehearsal,
  currentUserId,
  messages,
}: RehearsalDetailViewProps) {
  const [rehearsal, setRehearsal] = useState(initialRehearsal);
  const [activeTab, setActiveTab] = useState<"details" | "chat">("details");
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [notesText, setNotesText] = useState(rehearsal.notes || "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const myParticipant = rehearsal.participants.find(
    (p) => p.user_id === currentUserId
  );
  const isCreator = rehearsal.created_by === currentUserId;
  const isPast = new Date(rehearsal.date) < new Date();
  const isActive = rehearsal.status === "scheduled";

  const acceptedCount = rehearsal.participants.filter(
    (p) => p.status === "accepted"
  ).length;
  const maybeCount = rehearsal.participants.filter(
    (p) => p.status === "maybe"
  ).length;
  const declinedCount = rehearsal.participants.filter(
    (p) => p.status === "declined"
  ).length;

  const handleRsvp = async (status: RehearsalRsvpStatus) => {
    setRsvpLoading(true);
    const result = await respondToRehearsal(rehearsal.id, status);
    if (result.success && myParticipant) {
      setRehearsal((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.user_id === currentUserId ? { ...p, status } : p
        ),
      }));
    }
    setRsvpLoading(false);
  };

  const handleSaveNotes = async () => {
    await updateRehearsal(rehearsal.id, { notes: notesText });
    setRehearsal((prev) => ({ ...prev, notes: notesText }));
    setEditingNotes(false);
  };

  const handleCancel = async () => {
    if (!confirm("Annuler cette repetition ?")) return;
    await cancelRehearsal(rehearsal.id);
    setRehearsal((prev) => ({ ...prev, status: "cancelled" }));
  };

  const handleComplete = async () => {
    await completeRehearsal(rehearsal.id, notesText || undefined);
    setRehearsal((prev) => ({ ...prev, status: "completed" }));
  };

  const handleDelete = async (deleteAll: boolean) => {
    await deleteRehearsal(rehearsal.id, deleteAll);
    window.location.href = "/setlists";
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24">
      {/* Back + Header */}
      <div>
        <Link
          href="/commu/groupes"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Retour
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{rehearsal.title}</h1>
            <p className="text-sm text-muted-foreground">{rehearsal.band.name}</p>
          </div>
          {rehearsal.status !== "scheduled" && (
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                rehearsal.status === "cancelled"
                  ? "bg-red-500/20 text-red-400"
                  : "bg-green-500/20 text-green-400"
              }`}
            >
              {rehearsal.status === "cancelled" ? "Annulee" : "Terminee"}
            </span>
          )}
        </div>
      </div>

      {/* RSVP Buttons (if active) */}
      {isActive && myParticipant && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-medium">Ta presence :</p>
          <div className="flex gap-2">
            {(["accepted", "maybe", "declined"] as RehearsalRsvpStatus[]).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => handleRsvp(status)}
                  disabled={rsvpLoading}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    myParticipant.status === status
                      ? RSVP_COLORS[status]
                      : "border border-border hover:bg-accent"
                  } disabled:opacity-50`}
                >
                  {status === "accepted" && "Presente"}
                  {status === "maybe" && "Peut-etre"}
                  {status === "declined" && "Absente"}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("details")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "details"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Details
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "chat"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Discussion
          {(rehearsal.message_count ?? 0) > 0 && (
            <span className="rounded-full bg-primary/20 px-1.5 text-xs text-primary">
              {rehearsal.message_count}
            </span>
          )}
        </button>
      </div>

      {/* Details Tab */}
      {activeTab === "details" && (
        <div className="space-y-4">
          {/* Info card */}
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {/* Date & time */}
            <div className="flex items-center gap-3 p-4">
              <span className="material-symbols-outlined text-primary">calendar_today</span>
              <div>
                <p className="font-medium capitalize">
                  {formatFullDate(rehearsal.date)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(rehearsal.date)}
                  {rehearsal.end_date && ` - ${formatTime(rehearsal.end_date)}`}
                </p>
              </div>
              {/* .ics export */}
              <a
                href={`/api/rehearsals/${rehearsal.id}/ics`}
                download
                className="ml-auto rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                title="Ajouter au calendrier"
              >
                <span className="material-symbols-outlined text-[20px]">
                  calendar_add_on
                </span>
              </a>
            </div>

            {/* Location */}
            {rehearsal.location && (
              <div className="flex items-center gap-3 p-4">
                <span className="material-symbols-outlined text-primary">location_on</span>
                <div>
                  <p className="font-medium">{rehearsal.location}</p>
                  {rehearsal.location_url && (
                    <a
                      href={rehearsal.location_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Voir sur la carte
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Setlist */}
            {rehearsal.setlist && (
              <div className="flex items-center gap-3 p-4">
                <span className="material-symbols-outlined text-primary">queue_music</span>
                <div>
                  <p className="font-medium">{rehearsal.setlist.name}</p>
                  <p className="text-sm text-muted-foreground">Setlist liee</p>
                </div>
              </div>
            )}

            {/* Recurrence */}
            {rehearsal.recurrence !== "none" && (
              <div className="flex items-center gap-3 p-4">
                <span className="material-symbols-outlined text-primary">repeat</span>
                <div>
                  <p className="font-medium">{RECURRENCE_LABELS[rehearsal.recurrence]}</p>
                  {rehearsal.recurrence_end_date && (
                    <p className="text-sm text-muted-foreground">
                      Jusqu&apos;au {new Date(rehearsal.recurrence_end_date).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {rehearsal.description && (
              <div className="p-4">
                <p className="text-sm text-muted-foreground">{rehearsal.description}</p>
              </div>
            )}
          </div>

          {/* Participants */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">
                Participants ({rehearsal.participants.length})
              </h3>
              <div className="flex gap-2 text-xs">
                <span className="text-green-400">{acceptedCount} oui</span>
                <span className="text-yellow-400">{maybeCount} peut-etre</span>
                <span className="text-red-400">{declinedCount} non</span>
              </div>
            </div>
            <div className="space-y-2">
              {rehearsal.participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg bg-accent/50 p-2"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary overflow-hidden">
                    {p.profile.avatar_url ? (
                      <img
                        src={p.profile.avatar_url}
                        alt=""
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      (p.profile.display_name?.[0] || p.profile.username[0]).toUpperCase()
                    )}
                  </div>
                  <span className="flex-1 truncate text-sm">
                    {p.profile.display_name || p.profile.username}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      RSVP_COLORS[p.status]
                    }`}
                  >
                    {RSVP_LABELS[p.status]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes (post-rehearsal) */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Notes</h3>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Modifier
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="Notes sur cette repet (morceaux bosses, points a revoir...)"
                  rows={4}
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingNotes(false)}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    Sauvegarder
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {rehearsal.notes || "Aucune note pour l'instant"}
              </p>
            )}
          </div>

          {/* Actions */}
          {isActive && (
            <div className="flex flex-wrap gap-2">
              {isPast && (
                <button
                  onClick={handleComplete}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  Marquer comme terminee
                </button>
              )}
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/50 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                Annuler la repet
              </button>
              {(isCreator || rehearsal.band.owner_id === currentUserId) && (
                confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-destructive">Supprimer :</span>
                    <button
                      onClick={() => handleDelete(false)}
                      className="rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:opacity-90"
                    >
                      Celle-ci
                    </button>
                    {rehearsal.recurrence !== "none" && (
                      <button
                        onClick={() => handleDelete(true)}
                        className="rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:opacity-90"
                      >
                        Toutes
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="rounded-lg border border-destructive/50 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                  >
                    Supprimer
                  </button>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Chat Tab */}
      {activeTab === "chat" && (
        <div className="h-[60vh]">
          <BandChatPanel
            bandId={rehearsal.band_id}
            rehearsalId={rehearsal.id}
            currentUserId={currentUserId}
            initialMessages={messages}
            title={`Discussion - ${rehearsal.title}`}
          />
        </div>
      )}
    </div>
  );
}
