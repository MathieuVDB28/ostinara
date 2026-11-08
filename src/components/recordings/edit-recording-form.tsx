"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import { getRecordingLinkOptions, updateBandRecording } from "@/lib/actions/band-recordings";
import {
  BAND_RECORDING_KINDS,
  BAND_RECORDING_NOTE_MAX,
  BAND_RECORDING_TITLE_MAX,
  type BandRecordingKind,
} from "@/lib/band-recordings";
import type { BandRecordingListItem } from "@/types";

const INPUT =
  "min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm focus:border-primary";
const LABEL = "mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground";

/** Corriger titre, type, note, morceau et repete d'un enregistrement (l'auteur). */
export function EditRecordingForm({
  bandId,
  recording,
  onDone,
}: {
  bandId: string;
  recording: BandRecordingListItem;
  onDone: () => void;
}) {
  const t = useTranslations("recordings");
  const ta = useTranslations("recordings.addModal");
  const locale = useIntlLocale();
  const [title, setTitle] = useState(recording.title);
  const [kind, setKind] = useState<BandRecordingKind>(recording.kind);
  const [note, setNote] = useState(recording.note ?? "");
  const [bandSongId, setBandSongId] = useState(recording.band_song_id ?? "");
  const [rehearsalId, setRehearsalId] = useState(recording.rehearsal_id ?? "");
  const [options, setOptions] = useState<Awaited<ReturnType<typeof getRecordingLinkOptions>> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRecordingLinkOptions(bandId).then((result) => {
      if (!cancelled) setOptions(result);
    });
    return () => {
      cancelled = true;
    };
  }, [bandId]);

  const save = async () => {
    setSaving(true);
    setError(null);
    const result = await updateBandRecording(recording.id, {
      title,
      kind,
      note,
      band_song_id: bandSongId || null,
      rehearsal_id: rehearsalId || null,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? null);
      return;
    }
    onDone();
  };

  const dateFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });
  // La repete reliee peut etre future ou sortie de la liste : on la garde choisie.
  const rehearsals = options?.rehearsals ?? [];
  const keepRehearsal = recording.rehearsal && !rehearsals.some((rehearsal) => rehearsal.id === recording.rehearsal?.id);

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div>
        <label htmlFor="edit-recording-title" className={LABEL}>{ta("titleLabel")}</label>
        <input
          id="edit-recording-title"
          value={title}
          maxLength={BAND_RECORDING_TITLE_MAX}
          onChange={(event) => setTitle(event.target.value)}
          className={INPUT}
        />
      </div>
      <div>
        <span className={LABEL}>{ta("kindLabel")}</span>
        <div className="flex flex-wrap gap-2">
          {BAND_RECORDING_KINDS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
              className={`min-h-[36px] rounded-full border px-3 text-[13px] font-semibold transition-colors ${
                kind === value ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent"
              }`}
            >
              {t(`kinds.${value}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="edit-recording-song" className={LABEL}>{ta("songLabel")}</label>
          <select id="edit-recording-song" value={bandSongId} onChange={(event) => setBandSongId(event.target.value)} className={INPUT}>
            <option value="">{ta("noSong")}</option>
            {(options?.songs ?? (recording.band_song ? [recording.band_song] : [])).map((song) => (
              <option key={song.id} value={song.id}>
                {song.artist ? `${song.title} · ${song.artist}` : song.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="edit-recording-rehearsal" className={LABEL}>{ta("rehearsalLabel")}</label>
          <select id="edit-recording-rehearsal" value={rehearsalId} onChange={(event) => setRehearsalId(event.target.value)} className={INPUT}>
            <option value="">{ta("noRehearsal")}</option>
            {[...(keepRehearsal && recording.rehearsal ? [recording.rehearsal] : []), ...rehearsals].map((rehearsal) => (
              <option key={rehearsal.id} value={rehearsal.id}>
                {ta("rehearsalOption", {
                  title: rehearsal.title || t("kinds.rehearsal"),
                  date: dateFormat.format(new Date(rehearsal.date)),
                })}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="edit-recording-note" className={LABEL}>{ta("noteLabel")}</label>
        <textarea
          id="edit-recording-note"
          value={note}
          maxLength={BAND_RECORDING_NOTE_MAX}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary"
        />
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="min-h-[44px] rounded-full px-4 text-sm font-semibold hover:bg-accent">
          {ta("cancel")}
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !title.trim()}
          className="min-h-[44px] rounded-full bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-40"
        >
          {ta("save")}
        </button>
      </div>
    </div>
  );
}
