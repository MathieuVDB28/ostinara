"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, Plus, X } from "lucide-react";
import { Cover } from "@/components/ui/cover";
import { useMyInstruments } from "@/components/providers/instruments-provider";
import { saveRehearsalLog } from "@/lib/actions/rehearsal-logs";
import { isInFuture, toLocalInput } from "@/lib/datetime-local";
import { bandPosteLabel } from "@/lib/instruments";
import {
  REHEARSAL_DEFAULT_MINUTES,
  REHEARSAL_DURATION_PRESETS,
  REHEARSAL_MAX_MINUTES,
  REHEARSAL_TASK_MAX_LENGTH,
  rehearsalSongKey,
} from "@/lib/rehearsal-log";
import { formatDuration } from "@/components/progress/stats-summary";
import { useIntlLocale } from "@/i18n/intl-locale";
import {
  initialRehearsalInstrument,
  REHEARSAL_FIELD_LABEL,
  RehearsalCarnetFields,
} from "./rehearsal-carnet-fields";
import { RehearsalVerdictPicker } from "./rehearsal-verdict-picker";
import type {
  BandWithMembers,
  Instrument,
  RehearsalLogDetails,
  RehearsalVerdict,
  RehearsalWithDetails,
  SessionMood,
  SetlistWithDetails,
} from "@/types";

interface RehearsalLogFormProps {
  band: BandWithMembers;
  setlists: SetlistWithDetails[];
  currentUserId: string;
  /** La repete a raconter ou a corriger. Absente : une repete jamais planifiee. */
  rehearsal: RehearsalWithDetails | null;
  log: RehearsalLogDetails | null;
  /** Passees et pas encore racontees : pour ne pas raconter deux fois la meme. */
  unlogged: { id: string; title: string; date: string }[];
  shareDefault: boolean;
}

interface FormSong {
  key: string;
  setlist_item_id: string | null;
  title: string;
  artist: string | null;
  cover_url: string | null;
  deezer_id: string | null;
  verdict: RehearsalVerdict | null;
}

interface FormTask {
  localId: string;
  id?: string;
  content: string;
  assignee_id: string;
}

interface CatalogResult {
  id: string;
  title: string;
  artist: string;
  cover_url?: string;
  deezer_id?: string;
}

const INPUT =
  "min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm focus:border-primary";
const SECTION_TITLE =
  "border-b border-border pb-2 font-display text-[13px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground";

function setlistSongs(setlist: SetlistWithDetails | undefined): FormSong[] {
  return [...(setlist?.items ?? [])]
    .filter((item) => item.item_type === "song" && item.song_title)
    .sort((a, b) => a.position - b.position)
    .map((item) => ({
      key: rehearsalSongKey(item.song_title ?? "", item.song_artist),
      setlist_item_id: item.id,
      title: item.song_title ?? "",
      artist: item.song_artist ?? null,
      cover_url: item.song_cover_url ?? null,
      deezer_id: null,
      verdict: null,
    }));
}

/** Combien de temps a dure la repete planifiee, si on avait note sa fin. */
function plannedMinutes(rehearsal: RehearsalWithDetails | null): number {
  if (rehearsal?.duration_minutes) return rehearsal.duration_minutes;
  if (rehearsal?.end_date) {
    const minutes = Math.round((new Date(rehearsal.end_date).getTime() - new Date(rehearsal.date).getTime()) / 60000);
    if (minutes >= 1 && minutes <= REHEARSAL_MAX_MINUTES) return minutes;
  }
  return REHEARSAL_DEFAULT_MINUTES;
}

/**
 * Raconter une repete : ce que le groupe garde (date, presents, morceaux,
 * points a bosser), puis ce qui n'appartient qu'a celui qui ecrit (son carnet).
 */
export function RehearsalLogForm({
  band,
  setlists,
  currentUserId,
  rehearsal,
  log,
  unlogged,
  shareDefault,
}: RehearsalLogFormProps) {
  const t = useTranslations("rehearsals.log");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const intlLocale = useIntlLocale();
  const router = useRouter();
  const { primary } = useMyInstruments();

  const alreadyLogged = Boolean(rehearsal?.logged_at);
  const me = band.members.find((member) => member.user_id === currentUserId) ?? null;
  const myAttendance = log?.attendees.find((attendee) => attendee.user_id === currentUserId) ?? null;
  const confirmedIds = new Set(
    (log?.attendees ?? []).filter((attendee) => attendee.status === "confirmed").map((attendee) => attendee.user_id)
  );

  const [title, setTitle] = useState(rehearsal?.title ?? "");
  const [date, setDate] = useState(toLocalInput(rehearsal?.date ?? new Date()));
  const [minutes, setMinutes] = useState(plannedMinutes(rehearsal));
  const [location, setLocation] = useState(rehearsal?.location ?? "");
  const [setlistId, setSetlistId] = useState(rehearsal?.setlist_id ?? "");
  const [notes, setNotes] = useState(rehearsal?.notes ?? "");

  const [attendeeIds, setAttendeeIds] = useState<string[]>(() => {
    if (log && log.attendees.length > 0) {
      return log.attendees.filter((attendee) => attendee.status !== "declined").map((attendee) => attendee.user_id);
    }
    // Ceux qui avaient dit oui ; toujours soi-meme, puisqu'on raconte.
    const accepted = (rehearsal?.participants ?? [])
      .filter((participant) => participant.status === "accepted")
      .map((participant) => participant.user_id);
    return [...new Set([currentUserId, ...accepted])];
  });

  const [songs, setSongs] = useState<FormSong[]>(() => {
    if (log && log.songs.length > 0) {
      return log.songs.map((song) => ({
        key: song.song_key,
        setlist_item_id: song.setlist_item_id,
        title: song.song_title,
        artist: song.song_artist,
        cover_url: song.song_cover_url,
        deezer_id: song.deezer_id,
        verdict: song.verdict,
      }));
    }
    return setlistSongs(setlists.find((setlist) => setlist.id === rehearsal?.setlist_id));
  });

  const [tasks, setTasks] = useState<FormTask[]>(() =>
    (log?.tasks ?? [])
      .filter((task) => !task.done_at)
      .map((task) => ({
        localId: task.id,
        id: task.id,
        content: task.content,
        assignee_id: task.assignee_id ?? "",
      }))
  );

  const canAddToCarnet = !confirmedIds.has(currentUserId) && myAttendance?.status !== "declined";
  const [addToCarnet, setAddToCarnet] = useState(canAddToCarnet && !alreadyLogged);
  const [instrument, setInstrument] = useState<Instrument>(() => initialRehearsalInstrument(me, primary));
  const [mood, setMood] = useState<SessionMood | null>(null);
  const [share, setShare] = useState(shareDefault);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogResult[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Un autre membre a enregistre entre-temps : on repart de sa version.
  const [conflict, setConflict] = useState(false);

  const trimmedQuery = query.trim();
  useEffect(() => {
    if (trimmedQuery.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/catalog/search?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal,
        });
        if (response.ok) setResults(await response.json());
      } catch {
        // requete annulee par la frappe suivante
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmedQuery]);

  const toggleAttendee = (userId: string) => {
    setAttendeeIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  };

  const addSong = (song: Omit<FormSong, "key" | "verdict" | "setlist_item_id">) => {
    const key = rehearsalSongKey(song.title, song.artist);
    setSongs((current) =>
      current.some((known) => known.key === key)
        ? current
        : [...current, { ...song, key, setlist_item_id: null, verdict: null }]
    );
    setQuery("");
    setResults([]);
  };

  /** Changer de setlist remplace ses morceaux ; ce qui a ete ajoute a la main reste. */
  const changeSetlist = (id: string) => {
    setSetlistId(id);
    const next = setlistSongs(setlists.find((setlist) => setlist.id === id));
    setSongs((current) => {
      const nextKeys = new Set(next.map((song) => song.key));
      const verdicts = new Map(current.map((song) => [song.key, song.verdict]));
      return [
        ...next.map((song) => ({ ...song, verdict: verdicts.get(song.key) ?? null })),
        ...current.filter((song) => !song.setlist_item_id && !nextKeys.has(song.key)),
      ];
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setConflict(false);

    if (!date || isInFuture(new Date(date))) {
      setError(t("futureDate"));
      return;
    }
    if (!(minutes >= 1 && minutes <= REHEARSAL_MAX_MINUTES)) {
      setError(t("invalidDuration"));
      return;
    }
    if (attendeeIds.length === 0) {
      setError(t("nobody"));
      return;
    }

    setSaving(true);
    const result = await saveRehearsalLog({
      rehearsal_id: rehearsal?.id ?? null,
      expected_updated_at: rehearsal?.updated_at ?? null,
      band_id: band.id,
      title,
      date: new Date(date).toISOString(),
      duration_minutes: minutes,
      location,
      setlist_id: setlistId || null,
      notes,
      attendee_ids: attendeeIds,
      songs: songs.map((song) => ({
        setlist_item_id: song.setlist_item_id,
        title: song.title,
        artist: song.artist,
        cover_url: song.cover_url,
        deezer_id: song.deezer_id,
        verdict: song.verdict,
      })),
      tasks: tasks.map(({ id, content, assignee_id }) => ({ id, content, assignee_id: assignee_id || null })),
      carnet: addToCarnet && attendeeIds.includes(currentUserId) ? { instrument, mood, share } : null,
    });

    if (!result.success || !result.rehearsalId) {
      setError(result.error ?? t("failed"));
      setConflict(Boolean(result.conflict));
      setSaving(false);
      return;
    }
    router.push(`/setlists/rehearsals/${result.rehearsalId}`);
  };

  const backHref = rehearsal ? `/setlists/rehearsals/${rehearsal.id}` : `/commu/groupes/${band.id}`;
  const carnetOffered = canAddToCarnet && attendeeIds.includes(currentUserId);

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-8 pb-24">
      <div>
        <Link
          href={backHref}
          className="-ml-1 mb-3 inline-flex min-h-[36px] items-center gap-1 rounded-lg px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
          {rehearsal ? rehearsal.title : band.name}
        </Link>
        <h1 className="font-display text-[40px] font-extrabold uppercase leading-[0.9]">
          {alreadyLogged ? t("editTitle") : t("title")}
        </h1>
        <p className="mt-1 font-display text-sm font-bold uppercase tracking-[0.06em] text-muted-foreground">
          {band.name}
        </p>
      </div>

      {/* Deja planifiee ? On la complete plutot que d'en creer une seconde. */}
      {!rehearsal && unlogged.length > 0 && (
        <div className="border-y border-border py-3">
          <p className="text-sm font-semibold">{t("plannedQuestion")}</p>
          <ul className="mt-1">
            {unlogged.map((planned) => (
              <li key={planned.id}>
                <Link
                  href={`/commu/groupes/${band.id}/raconter?repete=${planned.id}`}
                  className="flex min-h-[40px] items-center justify-between gap-3 text-sm hover:underline"
                >
                  <span className="truncate">{planned.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(planned.date).toLocaleDateString(intlLocale, { day: "numeric", month: "short" })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="rehearsal-date" className={REHEARSAL_FIELD_LABEL}>
              {t("date")}
            </label>
            <input
              id="rehearsal-date"
              type="datetime-local"
              required
              value={date}
              max={toLocalInput()}
              onChange={(event) => setDate(event.target.value)}
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor="rehearsal-location" className={REHEARSAL_FIELD_LABEL}>
              {t("location")}
            </label>
            <input
              id="rehearsal-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder={t("locationPlaceholder")}
              className={INPUT}
            />
          </div>
        </div>

        <div>
          <label htmlFor="rehearsal-minutes" className={REHEARSAL_FIELD_LABEL}>
            {t("duration")}
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {REHEARSAL_DURATION_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setMinutes(preset)}
                aria-pressed={minutes === preset}
                className={`min-h-[40px] rounded-xl border px-3 text-sm font-semibold transition-colors ${
                  minutes === preset ? "border-foreground bg-secondary" : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {formatDuration(preset, tc)}
              </button>
            ))}
            <span className="flex items-center gap-1.5">
              <input
                id="rehearsal-minutes"
                type="number"
                inputMode="numeric"
                min={1}
                max={REHEARSAL_MAX_MINUTES}
                value={minutes || ""}
                onChange={(event) => setMinutes(Number(event.target.value))}
                className="tabular min-h-[40px] w-20 rounded-xl border border-input bg-background px-3 text-sm focus:border-primary"
              />
              <span className="text-sm text-muted-foreground">{t("minutesUnit")}</span>
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="rehearsal-title" className={REHEARSAL_FIELD_LABEL}>
            {t("name")}
          </label>
          <input
            id="rehearsal-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("namePlaceholder")}
            className={INPUT}
          />
        </div>
      </section>

      <section>
        <h2 className={SECTION_TITLE}>{t("attendees")}</h2>
        <p className="mt-2 text-xs text-muted-foreground">{t("attendeesHint")}</p>
        <ul className="mt-1">
          {band.members.map((member) => {
            const name = member.profile?.display_name || member.profile?.username || "";
            const poste = bandPosteLabel(member, te);
            const confirmed = confirmedIds.has(member.user_id);
            return (
              <li key={member.id} className="border-b border-border">
                <label className="flex min-h-[48px] items-center gap-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={attendeeIds.includes(member.user_id)}
                    disabled={confirmed}
                    onChange={() => toggleAttendee(member.user_id)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {member.user_id === currentUserId ? t("me", { name }) : name}
                    {poste && <span className="font-normal text-muted-foreground"> · {poste}</span>}
                  </span>
                  {confirmed && <span className="shrink-0 text-xs font-semibold text-success">{t("confirmed")}</span>}
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className={SECTION_TITLE}>{t("songs")}</h2>

        {setlists.length > 0 && (
          <div className="mt-3">
            <label htmlFor="rehearsal-setlist" className={REHEARSAL_FIELD_LABEL}>
              {t("setlist")}
            </label>
            <select
              id="rehearsal-setlist"
              value={setlistId}
              onChange={(event) => changeSetlist(event.target.value)}
              className={INPUT}
            >
              <option value="">{t("noSetlist")}</option>
              {setlists.map((setlist) => (
                <option key={setlist.id} value={setlist.id}>
                  {setlist.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {songs.length > 0 ? (
          <ul className="mt-3">
            {songs.map((song) => (
              <li key={song.key} className="border-b border-border py-3">
                <div className="flex items-center gap-3">
                  <Cover src={song.cover_url} className="h-10 w-10 shrink-0 rounded-[3px]" />
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {song.title}
                    {song.artist && <span className="font-normal text-muted-foreground"> · {song.artist}</span>}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSongs((current) => current.filter((known) => known.key !== song.key))}
                    aria-label={t("removeSong", { title: song.title })}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-2">
                  <RehearsalVerdictPicker
                    label={t("verdictFor", { title: song.title })}
                    value={song.verdict}
                    onChange={(verdict) =>
                      setSongs((current) =>
                        current.map((known) => (known.key === song.key ? { ...known, verdict } : known))
                      )
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 text-sm text-muted-foreground">{t("noSongs")}</p>
        )}

        <div className="mt-3">
          <label htmlFor="rehearsal-song-search" className={REHEARSAL_FIELD_LABEL}>
            {t("addSong")}
          </label>
          <input
            id="rehearsal-song-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            autoComplete="off"
            className={INPUT}
          />
          {trimmedQuery.length >= 2 && (
            <ul className="mt-1 max-h-72 divide-y divide-border overflow-y-auto">
              {results.slice(0, 6).map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    onClick={() =>
                      addSong({
                        title: result.title,
                        artist: result.artist,
                        cover_url: result.cover_url ?? null,
                        deezer_id: result.deezer_id ?? result.id,
                      })
                    }
                    className="flex min-h-[52px] w-full items-center gap-3 py-2 text-left hover:bg-accent/50"
                  >
                    <Cover src={result.cover_url} className="h-9 w-9 shrink-0 rounded-[3px]" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{result.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{result.artist}</span>
                    </span>
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => addSong({ title: trimmedQuery, artist: null, cover_url: null, deezer_id: null })}
                  className="flex min-h-[44px] w-full items-center gap-2 py-2 text-left text-sm font-semibold hover:bg-accent/50"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t("addAsTyped", { title: trimmedQuery })}
                </button>
              </li>
            </ul>
          )}
        </div>
      </section>

      <section>
        <h2 className={SECTION_TITLE}>{t("tasks")}</h2>
        {tasks.length === 0 && <p className="py-3 text-sm text-muted-foreground">{t("tasksHint")}</p>}
        <ul>
          {tasks.map((task) => (
            <li key={task.localId} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-b border-border py-2.5 sm:grid-cols-[minmax(0,1fr)_170px_auto]">
              <input
                value={task.content}
                maxLength={REHEARSAL_TASK_MAX_LENGTH}
                aria-label={t("taskContent")}
                placeholder={t("taskPlaceholder")}
                onChange={(event) =>
                  setTasks((current) =>
                    current.map((known) =>
                      known.localId === task.localId ? { ...known, content: event.target.value } : known
                    )
                  )
                }
                className={`${INPUT} col-start-1 row-start-1`}
              />
              <button
                type="button"
                onClick={() => setTasks((current) => current.filter((known) => known.localId !== task.localId))}
                aria-label={t("removeTask")}
                className="col-start-2 row-start-1 flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground sm:col-start-3"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
              <select
                value={task.assignee_id}
                aria-label={t("taskAssignee")}
                onChange={(event) =>
                  setTasks((current) =>
                    current.map((known) =>
                      known.localId === task.localId ? { ...known, assignee_id: event.target.value } : known
                    )
                  )
                }
                className={`${INPUT} col-span-2 sm:col-span-1 sm:col-start-2 sm:row-start-1`}
              >
                <option value="">{t("taskEveryone")}</option>
                {band.members.map((member) => (
                  <option key={member.id} value={member.user_id}>
                    {member.profile?.display_name || member.profile?.username}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() =>
            setTasks((current) => [
              ...current,
              { localId: crypto.randomUUID(), content: "", assignee_id: "" },
            ])
          }
          className="mt-2 inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-border px-3.5 text-sm font-semibold transition-colors hover:bg-accent"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("addTask")}
        </button>
      </section>

      <section>
        <label htmlFor="rehearsal-notes" className={SECTION_TITLE + " block"}>
          {t("notes")}
        </label>
        <textarea
          id="rehearsal-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          placeholder={t("notesPlaceholder")}
          className="mt-3 w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-primary"
        />
      </section>

      {carnetOffered && (
        <section>
          <h2 className={SECTION_TITLE}>{t("myCarnet")}</h2>
          <label className="mt-3 flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={addToCarnet}
              onChange={(event) => setAddToCarnet(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
            />
            <span>
              <span className="font-semibold">{t("addToCarnet", { duration: formatDuration(minutes || 0, tc) })}</span>
              <span className="block text-xs text-muted-foreground">{t("addToCarnetHint")}</span>
            </span>
          </label>
          {addToCarnet && (
            <div className="mt-4">
              <RehearsalCarnetFields
                poste={me}
                instrument={instrument}
                onInstrumentChange={setInstrument}
                mood={mood}
                onMoodChange={setMood}
                share={share}
                onShareChange={setShare}
              />
            </div>
          )}
        </section>
      )}

      {error && (
        <div role="alert" className="space-y-2">
          <p className="text-sm font-semibold text-destructive">{error}</p>
          {conflict && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[44px] rounded-xl border border-border px-4 text-sm font-bold transition-colors hover:bg-muted"
            >
              {t("reload")}
            </button>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-primary px-4 font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {saving ? t("saving") : alreadyLogged ? t("saveChanges") : t("submit")}
      </button>
    </form>
  );
}
