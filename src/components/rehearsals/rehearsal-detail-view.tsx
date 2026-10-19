"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import {
  respondToRehearsal,
  updateRehearsal,
  cancelRehearsal,
  completeRehearsal,
  deleteRehearsal,
} from "@/lib/actions/rehearsals";
import { BandChatPanel } from "./band-chat-panel";
import { RSVP_COLORS } from "@/types";
import type {
  RehearsalWithDetails,
  RehearsalRsvpStatus,
  BandMessageWithProfile,
} from "@/types";
import { Icon } from "@/components/ui/icon";
import { bandPosteLabel, instrumentMeta } from "@/lib/instruments";
import { rehearsalLineup } from "@/lib/rehearsal-lineup";

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
  const t = useTranslations("rehearsals.detail");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const intlLocale = useIntlLocale();
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

  const bandMembers = rehearsal.band.members ?? [];
  const lineup = rehearsalLineup(bandMembers, rehearsal.participants, te);
  const posteOf = (userId: string) => {
    const member = bandMembers.find((m) => m.user_id === userId);
    return member ? bandPosteLabel(member, te) : null;
  };

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
    if (!confirm(t("confirmCancel"))) return;
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
    return new Date(dateString).toLocaleDateString(intlLocale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString(intlLocale, {
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
          {t("bands")}
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
              {rehearsal.status === "cancelled" ? t("cancelled") : t("completed")}
            </span>
          )}
        </div>
      </div>

      {/* RSVP Buttons (if active) */}
      {isActive && myParticipant && (
        <div className="border-y border-border py-3">
          <p className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("yourAttendance")}</p>
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
                  {status === "accepted" && t("accepted")}
                  {status === "maybe" && t("maybe")}
                  {status === "declined" && t("declined")}
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
          {t("details")}
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-1.5 pb-2.5 pt-1 text-sm font-semibold transition-colors ${
            activeTab === "chat"
              ? "text-foreground shadow-[inset_0_-2px_0_var(--foreground)]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("discussion")}
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
                title={t("addToCalendar")}
                aria-label={t("addToCalendar")}
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
                      {t("seeMap")}
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
                  <p className="text-sm text-muted-foreground">{t("linkedSetlist")}</p>
                </div>
              </div>
            )}

            {/* Recurrence */}
            {rehearsal.recurrence !== "none" && (
              <div className="flex items-center gap-3 py-3">
                <Icon name="repeat" className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{te(`recurrence.${rehearsal.recurrence}`)}</p>
                  {rehearsal.recurrence_end_date && (
                    <p className="text-sm text-muted-foreground">
                      {t("until", { date: new Date(rehearsal.recurrence_end_date).toLocaleDateString(intlLocale) })}
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

          {/* Line-up par poste */}
          {lineup.length > 0 && (
            <div>
              <h3 className="mb-1 border-b border-border pb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("lineup")}
              </h3>
              <ul>
                {lineup.map((poste) => (
                  <li key={poste.key} className="flex items-center gap-3 border-b border-border py-2">
                    <Icon name={instrumentMeta(poste.instrument).icon} className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm font-semibold">{poste.label}</span>
                    <span
                      className={`text-xs font-semibold ${
                        poste.state === "accepted"
                          ? "text-success"
                          : poste.state === "declined"
                            ? "text-destructive"
                            : "text-muted-foreground"
                      }`}
                    >
                      {poste.state === "accepted" && t("posteAccepted")}
                      {poste.state === "maybe" && t("posteMaybe")}
                      {poste.state === "invited" && t("posteInvited")}
                      {poste.state === "declined" && t("posteDeclined")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Participants */}
          <div>
            <div className="mb-1 flex items-center justify-between border-b border-border pb-1.5">
              <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("participants", { count: rehearsal.participants.length })}
              </h3>
              <div className="flex gap-2 text-xs">
                <span className="text-success">{t("yes", { count: acceptedCount })}</span>
                <span className="text-muted-foreground">{t("maybeCount", { count: maybeCount })}</span>
                <span className="text-destructive">{t("no", { count: declinedCount })}</span>
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
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {p.profile.display_name || p.profile.username}
                    {posteOf(p.user_id) && (
                      <span className="text-muted-foreground"> · {posteOf(p.user_id)}</span>
                    )}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                      RSVP_COLORS[p.status]
                    }`}
                  >
                    {te(`rsvp.${p.status}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes (post-rehearsal) */}
          <div>
            <div className="mb-2 flex items-center justify-between border-b border-border pb-1.5">
              <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("notes")}</h3>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-xs font-semibold text-foreground hover:underline"
                >
                  {tc("edit")}
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder={t("notesPlaceholder")}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingNotes(false)}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent"
                  >
                    {tc("cancel")}
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    {tc("saveShort")}
                  </button>
                </div>
              </div>
            ) : (
              <p className={rehearsal.notes ? "font-serif text-[15px] italic leading-relaxed" : "text-sm text-muted-foreground"}>
                {rehearsal.notes || t("noNotes")}
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
                  {t("markDone")}
                </button>
              )}
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/50 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                {t("cancelRehearsal")}
              </button>
              {(isCreator || rehearsal.band.owner_id === currentUserId) && (
                confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-destructive">{t("deleteLabel")}</span>
                    <button
                      onClick={() => handleDelete(false)}
                      className="rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:opacity-90"
                    >
                      {t("thisOne")}
                    </button>
                    {rehearsal.recurrence !== "none" && (
                      <button
                        onClick={() => handleDelete(true)}
                        className="rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:opacity-90"
                      >
                        {t("all")}
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent"
                    >
                      {tc("cancel")}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="rounded-lg border border-destructive/50 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                  >
                    {tc("delete")}
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
            title={t("chatTitle", { title: rehearsal.title })}
          />
        </div>
      )}
    </div>
  );
}
