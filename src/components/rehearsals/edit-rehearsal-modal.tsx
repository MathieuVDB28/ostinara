"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { updateRehearsal } from "@/lib/actions/rehearsals";
import { deviceTimeZone, fromWallTime, safeTimeZone, toWallTime, wallDateKey } from "@/lib/time-zone";
import type { RehearsalWithDetails } from "@/types";

interface EditRehearsalModalProps {
  rehearsal: RehearsalWithDetails;
  setlists: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}

const FIELD = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary";
const LABEL = "mb-1 block text-sm font-medium";

function wallTimeInput(value: string, timeZone: string): string {
  const { hour, minute } = toWallTime(new Date(value), timeZone);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** L'heure saisie est celle de la repete, meme depuis un autre fuseau. */
function fromInputs(date: string, time: string, timeZone: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return fromWallTime({ year, month, day, hour, minute }, timeZone).toISOString();
}

export function EditRehearsalModal({ rehearsal, setlists, onClose, onSuccess }: EditRehearsalModalProps) {
  const t = useTranslations("rehearsals.edit");
  const tf = useTranslations("rehearsals.create");
  const tc = useTranslations("common");
  const zone = safeTimeZone(rehearsal.time_zone);

  const [title, setTitle] = useState(rehearsal.title);
  const [description, setDescription] = useState(rehearsal.description ?? "");
  const [date, setDate] = useState(wallDateKey(new Date(rehearsal.date), zone));
  const [time, setTime] = useState(wallTimeInput(rehearsal.date, zone));
  const [endTime, setEndTime] = useState(rehearsal.end_date ? wallTimeInput(rehearsal.end_date, zone) : "");
  const [location, setLocation] = useState(rehearsal.location ?? "");
  const [locationUrl, setLocationUrl] = useState(rehearsal.location_url ?? "");
  const [setlistId, setSetlistId] = useState(rehearsal.setlist_id ?? "");
  const [scope, setScope] = useState<"one" | "following">("one");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !time) return setError(t("required"));

    setSaving(true);
    setError(null);
    const result = await updateRehearsal(
      rehearsal.id,
      {
        title: title.trim(),
        description: description.trim() || undefined,
        date: fromInputs(date, time, zone),
        end_date: endTime ? fromInputs(date, endTime, zone) : undefined,
        location: location.trim() || undefined,
        location_url: locationUrl.trim() || undefined,
        setlist_id: setlistId || null,
      },
      scope
    );
    setSaving(false);

    if (!result.success) return setError(result.error ?? tc("genericError"));
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-rehearsal-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-md"
      >
        <div className="mb-6">
          <h2 id="edit-rehearsal-title" className="font-display text-3xl font-extrabold uppercase leading-none">
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{rehearsal.band.name}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className={LABEL}>{tf("name")}</span>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={FIELD} />
          </label>
          <label className="block">
            <span className={LABEL}>{tc("description")}</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${FIELD} resize-none`} />
          </label>

          <div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <label className="col-span-2 block sm:col-span-1">
                <span className={LABEL}>{tf("date")}</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} />
              </label>
              <label className="block">
                <span className={LABEL}>{tf("start")}</span>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={FIELD} />
              </label>
              <label className="block">
                <span className={LABEL}>{tf("end")}</span>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={FIELD} />
              </label>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("rsvpHint")}
              {zone !== deviceTimeZone() && ` ${t("zoneHint", { zone })}`}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={LABEL}>{tf("location")}</span>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={FIELD} />
            </label>
            <label className="block">
              <span className={LABEL}>{tf("maps")}</span>
              <input type="url" value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} className={FIELD} />
            </label>
          </div>

          {(setlists.length > 0 || setlistId) && (
            <label className="block">
              <span className={LABEL}>{tf("setlist")}</span>
              <select value={setlistId} onChange={(e) => setSetlistId(e.target.value)} className={FIELD}>
                <option value="">{tf("noSetlist")}</option>
                {setlists.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
          )}

          {rehearsal.recurrence !== "none" && (
            <fieldset>
              <legend className={LABEL}>{t("scope")}</legend>
              <div className="flex flex-wrap gap-4">
                {(["one", "following"] as const).map((value) => (
                  <label key={value} className="flex items-center gap-2 text-sm">
                    <input type="radio" name="scope" checked={scope === value} onChange={() => setScope(value)} />
                    {t(value)}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
          )}

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
              disabled={saving}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {tc("saveShort")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
