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
import { Icon } from "@/components/ui/icon";

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
          className="-ml-1 mb-3 inline-flex min-h-[36px] items-center gap-1 rounded-lg px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon name="chevron_left" className="h-4 w-4" strokeWidth={2.25} />
          Groupes
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[40px] font-extrabold uppercase leading-[0.9]">{rehearsal.title}</h1>
            <p className="mt-1 font-display text-sm font-bold uppercase tracking-[0.06em] text-muted-foreground">{rehearsal.band.name}</p>
          </div>
          {rehearsal.status !== "scheduled" && (
            <span
              className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] ${
                rehearsal.status === "cancelled"
                  ? "border-destructive text-destructive"
                  : "border-success text-success"
              }`}
            >
              {rehearsal.status === "cancelled" ? "Annulée" : "Terminée"}
            </span>
          )}
        </div>
      </div>

      {/* RSVP Buttons (if active) */}
      {isActive && myParticipant && (
        <div className="border-y border-border py-3">
          <p className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Ta présence</p>
          <div className="grid grid-cols-3 gap-1.5">
            {(["accepted", "maybe", "declined"] as RehearsalRsvpStatus[]).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => handleRsvp(status)}
                  disabled={rsvpLoading}
                  aria-pressed={myParticipant.status === status}
                  className={`min-h-[40px] rounded-xl border text-sm font-semibold transition-colors ${
                    myParticipant.status === status
                      ? "border-foreground bg-secondary"
                      : "border-border text-muted-foreground hover:bg-accent"
                  } disabled:opacity-50`}
                >
                  {status === "accepted" && "Présent·e"}
                  {status === "maybe" && "Peut-être"}
                  {status === "declined" && "Absent·e"}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-6 border-b border-border">
        <button
          onClick={() => setActiveTab("details")}
          className={`pb-2.5 pt-1 text-sm font-semibold transition-colors ${
            activeTab === "details"
              ? "text-foreground shadow-[inset_0_-2px_0_var(--foreground)]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Détails
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-1.5 pb-2.5 pt-1 text-sm font-semibold transition-colors ${
            activeTab === "chat"
              ? "text-foreground shadow-[inset_0_-2px_0_var(--foreground)]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Discussion
          {(rehearsal.message_count ?? 0) > 0 && (
            <span className="tabular text-xs text-muted-foreground">
              {rehearsal.message_count}
            </span>
          )}
        </button>
      </div>

      {/* Details Tab */}
      {activeTab === "details" && (
        <div className="space-y-4">
          {/* Info card */}
          <div className="divide-y divide-border border-y border-border">
            {/* Date & time */}
            <div className="flex items-center gap-3 py-3">
              <Icon name="calendar_today" className="h-5 w-5 text-muted-foreground" />
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
                <Icon name="calendar_add_on" className="h-[20px] w-[20px]" />
              </a>
            </div>

            {/* Location */}
            {rehearsal.location && (
              <div className="flex items-center gap-3 py-3">
                <Icon name="location_on" className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{rehearsal.location}</p>
                  {rehearsal.location_url && (
                    <a
                      href={rehearsal.location_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-foreground underline underline-offset-2"
                    >
                      Voir sur la carte
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Setlist */}
            {rehearsal.setlist && (
              <div className="flex items-center gap-3 py-3">
                <Icon name="queue_music" className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{rehearsal.setlist.name}</p>
                  <p className="text-sm text-muted-foreground">Setlist liée</p>
                </div>
              </div>
            )}

            {/* Recurrence */}
            {rehearsal.recurrence !== "none" && (
              <div className="flex items-center gap-3 py-3">
                <Icon name="repeat" className="h-5 w-5 text-muted-foreground" />
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
              <div className="py-3">
                <p className="font-serif text-[15px] italic text-muted-foreground">{rehearsal.description}</p>
              </div>
            )}
          </div>

          {/* Participants */}
          <div>
            <div className="mb-1 flex items-center justify-between border-b border-border pb-1.5">
              <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Participants · {rehearsal.participants.length}
              </h3>
              <div className="flex gap-2 text-xs">
                <span className="text-success">{acceptedCount} oui</span>
                <span className="text-muted-foreground">{maybeCount} peut-être</span>
                <span className="text-destructive">{declinedCount} non</span>
              </div>
            </div>
            <div>
              {rehearsal.participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 border-b border-border py-2"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-display text-sm font-extrabold text-muted-foreground">
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
                    className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
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
          <div>
            <div className="mb-2 flex items-center justify-between border-b border-border pb-1.5">
              <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Notes</h3>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-xs font-semibold text-foreground hover:underline"
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
                  placeholder="Notes sur cette répète (morceaux bossés, points à revoir…)"
                  rows={4}
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
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
              <p className={rehearsal.notes ? "font-serif text-[15px] italic leading-relaxed" : "text-sm text-muted-foreground"}>
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
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-foreground px-3.5 text-sm font-semibold text-background hover:opacity-90"
                >
                  <Icon name="check" className="h-[16px] w-[16px]" />
                  Marquer comme terminée
                </button>
              )}
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/50 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                Annuler la répète
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
