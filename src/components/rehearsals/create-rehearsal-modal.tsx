"use client";

import { useState, useEffect } from "react";
import { createRehearsal } from "@/lib/actions/rehearsals";
import { useTranslations } from "next-intl";
import type { BandWithMembers, Setlist, RecurrenceType } from "@/types";

interface CreateRehearsalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  band: BandWithMembers;
  setlists: Setlist[];
}

export function CreateRehearsalModal({
  isOpen,
  onClose,
  onSuccess,
  band,
  setlists,
}: CreateRehearsalModalProps) {
  const t = useTranslations("rehearsals.create");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("20:00");
  const [endTime, setEndTime] = useState("22:00");
  const [location, setLocation] = useState("");
  const [locationUrl, setLocationUrl] = useState("");
  const [setlistId, setSetlistId] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceType>("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDescription("");
      setDate("");
      setTime("20:00");
      setEndTime("22:00");
      setLocation("");
      setLocationUrl("");
      setSetlistId("");
      setRecurrence("none");
      setRecurrenceEndDate("");
      // Select all members by default
      setSelectedMembers(band.members.map((m) => m.user_id));
      setError(null);
    }
  }, [isOpen, band.members]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !time) {
      setError(t("required"));
      return;
    }

    if (recurrence !== "none" && !recurrenceEndDate) {
      setError(t("recurrenceEndRequired"));
      return;
    }

    setSaving(true);
    setError(null);

    const startDateTime = new Date(`${date}T${time}`);
    const endDateTime = endTime ? new Date(`${date}T${endTime}`) : undefined;

    const result = await createRehearsal({
      band_id: band.id,
      title: title.trim(),
      description: description.trim() || undefined,
      date: startDateTime.toISOString(),
      end_date: endDateTime?.toISOString(),
      location: location.trim() || undefined,
      location_url: locationUrl.trim() || undefined,
      setlist_id: setlistId || undefined,
      participant_ids: selectedMembers,
      recurrence,
      recurrence_end_date: recurrenceEndDate || undefined,
    });

    setSaving(false);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || tc("genericError"));
    }
  };

  // Band setlists only
  const bandSetlists = setlists.filter((s) => s.band_id === band.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-md">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-3xl font-extrabold uppercase leading-none">{t("title")}</h2>
            <p className="text-sm text-muted-foreground">{band.name}</p>
          </div>
          <button aria-label={tc("close")}
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium">{t("name")}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("namePlaceholder")}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium">{tc("description")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={2}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
            />
          </div>

          {/* Date & Time */}
          <div className="grid gap-3 grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("date")}</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("start")}</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("end")}</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
              />
            </div>
          </div>

          {/* Location */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("location")}</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("locationPlaceholder")}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("maps")}</label>
              <input
                type="url"
                value={locationUrl}
                onChange={(e) => setLocationUrl(e.target.value)}
                placeholder="https://maps.google.com/..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
              />
            </div>
          </div>

          {/* Setlist */}
          {bandSetlists.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium">{t("setlist")}</label>
              <select
                value={setlistId}
                onChange={(e) => setSetlistId(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
              >
                <option value="">{t("noSetlist")}</option>
                {bandSetlists.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Recurrence */}
          <div>
            <label className="mb-1 block text-sm font-medium">{t("recurrence")}</label>
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
            >
              {(["none", "weekly", "biweekly", "monthly"] as const).map((value) => (
                <option key={value} value={value}>{te(`recurrence.${value}`)}</option>
              ))}
            </select>
          </div>

          {recurrence !== "none" && (
            <div>
              <label className="mb-1 block text-sm font-medium">{t("until")}</label>
              <input
                type="date"
                value={recurrenceEndDate}
                onChange={(e) => setRecurrenceEndDate(e.target.value)}
                min={date}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("untilHint")}
              </p>
            </div>
          )}

          {/* Members */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              {t("participants", { selected: selectedMembers.length, total: band.members.length })}
            </label>
            <div className="space-y-1.5">
              {band.members.map((member) => (
                <label
                  key={member.user_id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg bg-accent/50 p-2 transition-colors hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(member.user_id)}
                    onChange={() => toggleMember(member.user_id)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  {/* Avatar */}
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-muted-foreground overflow-hidden">
                    {member.profile.avatar_url ? (
                      <img
                        src={member.profile.avatar_url}
                        alt=""
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      (member.profile.display_name?.[0] || member.profile.username[0]).toUpperCase()
                    )}
                  </div>
                  <span className="text-sm">
                    {member.profile.display_name || member.profile.username}
                  </span>
                  {member.role === "owner" && (
                    <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[11px] text-primary">
                      {t("owner")}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              {tc("cancel")}
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim() || !date}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {saving ? tc("creating") : t("submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
