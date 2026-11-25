"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import { createPlannedSession, deletePlannedSession, updatePlannedSession } from "@/lib/actions/planned-sessions";
import { useMyInstruments } from "@/components/providers/instruments-provider";
import { ProUpsell } from "@/components/subscription/pro-upsell";
import { instrumentLabel } from "@/lib/instruments";
import { findConflicts, type AgendaEvent } from "@/lib/agenda";
import { occurrences } from "@/lib/rehearsal-series";
import { itemsOf } from "@/lib/planned-program";
import { deviceTimeZone, fromWallTime, safeTimeZone, toWallTime, wallDateKey } from "@/lib/time-zone";
import { REMIND_OPTIONS } from "./planned-sessions-section";
import type {
  ExerciseWithProgress,
  Instrument,
  PlannedItem,
  PlannedRemind,
  PlannedSession,
  RoutineWithItems,
  SetlistWithDetails,
  Song,
} from "@/types";

export type PlanPreset =
  | { kind: "empty"; day?: string }
  | { kind: "song"; song: Song }
  | { kind: "routine"; routine: RoutineWithItems }
  | { kind: "edit"; session: PlannedSession };

interface PlanSessionModalProps {
  preset: PlanPreset;
  songs: Song[];
  exercises: ExerciseWithProgress[];
  routines: RoutineWithItems[];
  setlists: SetlistWithDetails[];
  friends: { id: string; name: string }[];
  isPaid: boolean;
  /** Pour prevenir quand la session tombe sur une repete ou un concert. */
  agenda: AgendaEvent[];
  onClose: () => void;
}

const FIELD = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary";
const LABEL = "mb-1 block text-sm font-medium";
/** Lundi d'abord ; 0 = dimanche. */
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

function songItem(song: Song): PlannedItem {
  return {
    item_type: "song",
    song_id: song.id,
    song_title: song.title,
    song_artist: song.artist,
    song_cover_url: song.cover_url ?? undefined,
  };
}

function exerciseItem(exercise: ExerciseWithProgress): PlannedItem {
  return {
    item_type: "exercise",
    exercise_id: exercise.id,
    exercise_name: exercise.name,
    exercise_category: exercise.category,
  };
}

/** La prochaine heure pleine. */
function nextHour(): Date {
  const date = new Date(Date.now() + 3_600_000);
  date.setMinutes(0, 0, 0);
  return date;
}

export function PlanSessionModal({ preset, songs, exercises, routines, setlists, friends, isPaid, agenda, onClose }: PlanSessionModalProps) {
  const t = useTranslations("play.planned");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const intlLocale = useIntlLocale();
  const router = useRouter();
  const { instruments, primary, isMulti } = useMyInstruments();

  const session = preset.kind === "edit" ? preset.session : null;
  const zone = session ? safeTimeZone(session.time_zone) : deviceTimeZone();
  const [initialDate] = useState(() => (session ? new Date(session.starts_at) : nextHour()));
  const wall = toWallTime(initialDate, zone);

  const [title, setTitle] = useState(
    session?.title ?? (preset.kind === "song" ? preset.song.title : preset.kind === "routine" ? preset.routine.name : "")
  );
  const [date, setDate] = useState(preset.kind === "empty" && preset.day ? preset.day : wallDateKey(initialDate, zone));
  const [time, setTime] = useState(`${String(wall.hour).padStart(2, "0")}:${String(wall.minute).padStart(2, "0")}`);
  const [duration, setDuration] = useState(session?.duration_minutes ?? 30);
  const [instrument, setInstrument] = useState<Instrument | null>(session ? session.instrument : isMulti ? primary : null);
  // "" (a la carte), "routine:<id>" ou "setlist:<id>".
  const [source, setSource] = useState(() => {
    if (preset.kind === "routine") return `routine:${preset.routine.id}`;
    if (session?.routine_id) return `routine:${session.routine_id}`;
    if (session?.setlist_id) return `setlist:${session.setlist_id}`;
    return "";
  });
  const [items, setItems] = useState<PlannedItem[]>(
    preset.kind === "song" ? [songItem(preset.song)] : session && !session.routine_id && !session.setlist_id ? session.items : []
  );
  const [query, setQuery] = useState("");
  const [note, setNote] = useState(session?.note ?? "");
  const [location, setLocation] = useState(session?.location ?? "");
  const [guestId, setGuestId] = useState(session?.other?.user_id ?? "");
  const [remind, setRemind] = useState<PlannedRemind>(session ? session.me.remind_minutes : 15);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [until, setUntil] = useState("");
  const [scope, setScope] = useState<"one" | "following">("one");
  const [confirmDelete, setConfirmDelete] = useState(false);
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

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? [
        ...songs
          .filter((s) => `${s.title} ${s.artist}`.toLowerCase().includes(needle))
          .slice(0, 5)
          .map((s) => ({ key: s.id, label: `${s.title} · ${s.artist}`, item: songItem(s) })),
        ...exercises
          .filter((e) => e.name.toLowerCase().includes(needle))
          .slice(0, 5)
          .map((e) => ({ key: e.id, label: e.name, item: exerciseItem(e) })),
      ]
    : [];

  const startDate = () => {
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    return fromWallTime({ year, month, day, hour, minute }, zone);
  };
  const conflicts =
    date && time
      ? findConflicts(
          agenda,
          weekdays.length > 0 && until ? occurrences(startDate(), weekdays, until, zone) : [startDate()],
          duration
        )
      : [];

  const finish = (result: { success: boolean; error?: string }) => {
    setSaving(false);
    if (!result.success) return setError(result.error ?? tc("genericError"));
    router.refresh();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !time) return setError(t("required"));
    if (weekdays.length > 0 && !until) return setError(t("untilRequired"));

    const [kind, sourceId] = source.split(":");
    const picked =
      kind === "routine" ? routines.find((r) => r.id === sourceId) : kind === "setlist" ? setlists.find((s) => s.id === sourceId) : null;

    setSaving(true);
    setError(null);
    const input = {
      title,
      starts_at: startDate().toISOString(),
      duration_minutes: duration,
      time_zone: zone,
      note,
      location,
      instrument,
      routine_id: kind === "routine" ? sourceId : null,
      setlist_id: kind === "setlist" ? sourceId : null,
      items: picked ? itemsOf(picked) : source && session ? session.items : items,
      guest_id: guestId || null,
      remind_minutes: remind,
      ...(weekdays.length > 0 ? { weekdays, until } : {}),
    };
    finish(session ? await updatePlannedSession(session.id, input, scope) : await createPlannedSession(input));
  };

  const handleDelete = async () => {
    if (!session) return;
    setSaving(true);
    setError(null);
    finish(await deletePlannedSession(session.id, scope));
  };

  const dayName = (day: number) =>
    // Le 4 janvier 2026 est un dimanche.
    new Intl.DateTimeFormat(intlLocale, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 4 + day)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-session-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-md"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 id="plan-session-title" className="font-display text-3xl font-extrabold uppercase leading-none">
            {session ? t("editTitle") : t("newTitle")}
          </h2>
          <button type="button" onClick={onClose} aria-label={tc("close")} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
            <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className={LABEL}>{t("name")}</span>
            <input type="text" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder={t("namePlaceholder")} className={FIELD} />
          </label>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="col-span-2 block sm:col-span-1">
              <span className={LABEL}>{t("date")}</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} />
            </label>
            <label className="block">
              <span className={LABEL}>{t("time")}</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={FIELD} />
            </label>
            <label className="block">
              <span className={LABEL}>{t("duration")}</span>
              <input type="number" min={5} max={720} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={FIELD} />
            </label>
          </div>
          {zone !== deviceTimeZone() && <p className="text-xs text-muted-foreground">{t("zoneHint", { zone })}</p>}

          {isMulti && (
            <label className="block">
              <span className={LABEL}>{t("instrument")}</span>
              <select value={instrument ?? ""} onChange={(e) => setInstrument((e.target.value || null) as Instrument | null)} className={FIELD}>
                <option value="">{t("anyInstrument")}</option>
                {instruments.map((entry) => (
                  <option key={entry.instrument} value={entry.instrument}>{instrumentLabel(entry, te)}</option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className={LABEL}>{t("content")}</span>
            <select value={source} onChange={(e) => setSource(e.target.value)} className={FIELD}>
              <option value="">{t("custom")}</option>
              {routines.length > 0 && (
                <optgroup label={t("routines")}>
                  {routines.map((r) => <option key={r.id} value={`routine:${r.id}`}>{r.name}</option>)}
                </optgroup>
              )}
              {setlists.length > 0 && (
                <optgroup label={t("setlists")}>
                  {setlists.map((s) => <option key={s.id} value={`setlist:${s.id}`}>{s.name}</option>)}
                </optgroup>
              )}
            </select>
          </label>

          {source === "" && (
            <div className="space-y-2">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                aria-label={t("searchPlaceholder")}
                className={FIELD}
              />
              {matches.length > 0 && (
                <ul className="rounded-lg border border-border">
                  {matches.map((match) => (
                    <li key={match.key}>
                      <button
                        type="button"
                        onClick={() => {
                          setItems([...items, match.item]);
                          setQuery("");
                        }}
                        className="w-full truncate px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        {match.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2 border-b border-border py-1.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">{item.song_title ?? item.exercise_name}</span>
                  <button
                    type="button"
                    onClick={() => setItems(items.filter((_, i) => i !== index))}
                    aria-label={t("removeItem", { name: item.song_title ?? item.exercise_name ?? "" })}
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <label className="block">
            <span className={LABEL}>{t("reminder")}</span>
            <select
              value={remind ?? ""}
              onChange={(e) => setRemind(e.target.value === "" ? null : (Number(e.target.value) as PlannedRemind))}
              className={FIELD}
            >
              {REMIND_OPTIONS.map((option) => (
                <option key={option.key} value={option.value ?? ""}>{t(`remind.${option.key}`)}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={LABEL}>{t("location")}</span>
            <input type="text" value={location} maxLength={200} onChange={(e) => setLocation(e.target.value)} className={FIELD} />
          </label>
          <label className="block">
            <span className={LABEL}>{t("note")}</span>
            <textarea value={note} maxLength={500} rows={2} onChange={(e) => setNote(e.target.value)} className={`${FIELD} resize-none`} />
          </label>

          {isPaid || guestId ? (
            <label className="block">
              <span className={LABEL}>{t("inviteFriend")}</span>
              <select value={guestId} onChange={(e) => setGuestId(e.target.value)} className={FIELD}>
                <option value="">{t("nobody")}</option>
                {session?.other && !friends.some((f) => f.id === session.other?.user_id) && (
                  <option value={session.other.user_id}>
                    {session.other.profile.display_name || session.other.profile.username}
                  </option>
                )}
                {friends.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <span className="mt-1 block text-xs text-muted-foreground">{t("inviteHint")}</span>
            </label>
          ) : null}

          {!session && isPaid && (
            <fieldset>
              <legend className={LABEL}>{t("repeat")}</legend>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={weekdays.includes(day)}
                    onClick={() => setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))}
                    className={`min-h-[36px] rounded-lg border px-2.5 text-xs font-semibold ${
                      weekdays.includes(day) ? "border-foreground bg-secondary" : "border-border text-muted-foreground"
                    }`}
                  >
                    {dayName(day)}
                  </button>
                ))}
              </div>
              {weekdays.length > 0 && (
                <label className="mt-3 block">
                  <span className={LABEL}>{t("until")}</span>
                  <input type="date" value={until} min={date} onChange={(e) => setUntil(e.target.value)} className={FIELD} />
                </label>
              )}
            </fieldset>
          )}

          {!isPaid && <ProUpsell compact feature={t("upsell")} description={t("upsell")} />}

          {session?.series_id && (
            <fieldset>
              <legend className={LABEL}>{t("scope")}</legend>
              <div className="flex flex-wrap gap-4">
                {(["one", "following"] as const).map((value) => (
                  <label key={value} className="flex items-center gap-2 text-sm">
                    <input type="radio" name="planned-scope" checked={scope === value} onChange={() => setScope(value)} />
                    {t(`scopes.${value}`)}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {conflicts.length > 0 && (
            <p role="status" className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm">
              {t("conflict", { title: conflicts[0].title, count: conflicts.length - 1 })}
            </p>
          )}
          {error && <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 pt-2">
            {session && (
              <button
                type="button"
                disabled={saving}
                onClick={() => (confirmDelete ? handleDelete() : setConfirmDelete(true))}
                className="rounded-lg border border-destructive/50 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                {confirmDelete ? t("confirmDelete") : tc("delete")}
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {session ? tc("saveShort") : t("plan")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
