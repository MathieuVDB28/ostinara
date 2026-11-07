"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { createRehearsalPoll } from "@/lib/actions/rehearsal-polls";
import { useDepsChanged } from "@/lib/hooks/use-deps-changed";
import type { BandWithMembers, Setlist } from "@/types";

const MIN_SLOTS = 2;
const MAX_SLOTS = 8;
const FIELD =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary";

interface Slot {
  key: number;
  date: string;
  start: string;
  end: string;
}

/** "2026-11-12" + n jours, en heure locale. */
function nextDay(date: string): string {
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(y, m - 1, d + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}

interface CreateRehearsalPollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  band: BandWithMembers;
  setlists: Setlist[];
}

export function CreateRehearsalPollModal({
  isOpen,
  onClose,
  onSuccess,
  band,
  setlists,
}: CreateRehearsalPollModalProps) {
  const t = useTranslations("rehearsals.poll");
  const tf = useTranslations("rehearsals.create");
  const tc = useTranslations("common");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [setlistId, setSetlistId] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [nextKey, setNextKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useDepsChanged([isOpen]);
  if (reset && isOpen) {
    setTitle(t("defaultTitle"));
    setLocation("");
    setSetlistId("");
    setSlots([
      { key: 0, date: "", start: "20:00", end: "22:00" },
      { key: 1, date: "", start: "20:00", end: "22:00" },
    ]);
    setNextKey(2);
    setError(null);
  }

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const updateSlot = (key: number, change: Partial<Slot>) =>
    setSlots((current) => current.map((slot) => (slot.key === key ? { ...slot, ...change } : slot)));

  // Le creneau suivant reprend les horaires du dernier, le lendemain.
  const addSlot = () => {
    const last = slots[slots.length - 1];
    setSlots([
      ...slots,
      { key: nextKey, date: nextDay(last?.date ?? ""), start: last?.start ?? "20:00", end: last?.end ?? "22:00" },
    ]);
    setNextKey(nextKey + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || slots.some((slot) => !slot.date || !slot.start)) {
      setError(t("required"));
      return;
    }

    setSaving(true);
    setError(null);
    const result = await createRehearsalPoll({
      band_id: band.id,
      title: title.trim(),
      location: location.trim() || undefined,
      setlist_id: setlistId || undefined,
      options: slots.map((slot) => {
        const start = new Date(`${slot.date}T${slot.start}`);
        const end = slot.end ? new Date(`${slot.date}T${slot.end}`) : null;
        return {
          starts_at: start.toISOString(),
          // Une fin avant le debut : la repete finit apres minuit.
          ends_at: end ? new Date(end <= start ? end.getTime() + 86_400_000 : end.getTime()).toISOString() : null,
        };
      }),
    });
    setSaving(false);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || tc("genericError"));
    }
  };

  const bandSetlists = setlists.filter((setlist) => setlist.band_id === band.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-poll-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-md"
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 id="create-poll-title" className="font-display text-3xl font-extrabold uppercase leading-none">
              {t("suggest")}
            </h2>
            <p className="text-sm text-muted-foreground">{band.name}</p>
          </div>
          <button
            type="button"
            aria-label={tc("close")}
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="poll-title" className="mb-1 block text-sm font-medium">{tf("name")}</label>
            <input
              id="poll-title"
              type="text"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              className={FIELD}
            />
          </div>

          <fieldset>
            <legend className="mb-1 text-sm font-medium">{t("slots")}</legend>
            <p className="mb-2 text-xs text-muted-foreground">{t("slotsHint")}</p>
            <ol className="space-y-3">
              {slots.map((slot, index) => (
                <li key={slot.key} className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {t("slotLabel", { n: index + 1 })}
                    </span>
                    {slots.length > MIN_SLOTS && (
                      <button
                        type="button"
                        aria-label={t("removeSlot", { n: index + 1 })}
                        onClick={() => setSlots(slots.filter((item) => item.key !== slot.key))}
                        className="-m-2 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                      >
                        <Icon name="close" className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="block">
                      <span className="mb-1 block text-xs">{tf("date")}</span>
                      <input
                        type="date"
                        value={slot.date}
                        onChange={(e) => updateSlot(slot.key, { date: e.target.value })}
                        className={FIELD}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs">{tf("start")}</span>
                      <input
                        type="time"
                        value={slot.start}
                        onChange={(e) => updateSlot(slot.key, { start: e.target.value })}
                        className={FIELD}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs">{tf("end")}</span>
                      <input
                        type="time"
                        value={slot.end}
                        onChange={(e) => updateSlot(slot.key, { end: e.target.value })}
                        className={FIELD}
                      />
                    </label>
                  </div>
                </li>
              ))}
            </ol>
            {slots.length < MAX_SLOTS && (
              <button
                type="button"
                onClick={addSlot}
                className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-foreground"
              >
                <Icon name="add" className="h-4 w-4" />
                {t("addSlot")}
              </button>
            )}
          </fieldset>

          <div>
            <label htmlFor="poll-location" className="mb-1 block text-sm font-medium">{tf("location")}</label>
            <input
              id="poll-location"
              type="text"
              value={location}
              maxLength={200}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={tf("locationPlaceholder")}
              className={FIELD}
            />
          </div>

          {bandSetlists.length > 0 && (
            <div>
              <label htmlFor="poll-setlist" className="mb-1 block text-sm font-medium">{tf("setlist")}</label>
              <select
                id="poll-setlist"
                value={setlistId}
                onChange={(e) => setSetlistId(e.target.value)}
                className={FIELD}
              >
                <option value="">{tf("noSetlist")}</option>
                {bandSetlists.map((setlist) => (
                  <option key={setlist.id} value={setlist.id}>{setlist.name}</option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] flex-1 rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              {tc("cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] flex-1 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {t("submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
