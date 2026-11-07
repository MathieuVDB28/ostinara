"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { updateBandSong } from "@/lib/actions/band-songs";
import {
  BAND_SONG_MAX_MEASURES,
  BAND_SONG_MAX_PARTS,
  BAND_SONG_NOTES_MAX,
  KEY_MODES,
  KEY_NOTES,
  partsFromSections,
  sectionsFromParts,
  type StructurePart,
} from "@/lib/band-songs";
import { ALL_TUNINGS } from "@/lib/tunings";
import { PLAYED_SECTION_PRESETS, type BandSong, type MusicalMode } from "@/types";

const INPUT =
  "min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm focus:border-primary";
const LABEL = "mb-1 block font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";
const SECTION_TITLE =
  "border-b border-border pb-2 font-display text-[13px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground";

interface FormPart extends StructurePart {
  localId: number;
}

/** Un nombre saisi, ou null quand le champ est vide. */
function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.round(parsed) : NaN;
}

interface BandSongFormProps {
  song: BandSong;
  onCancel: () => void;
}

/** Modifier la fiche : tout le contenu musical, d'un bloc. */
export function BandSongForm({ song, onCancel }: BandSongFormProps) {
  const t = useTranslations("repertoire.form");
  const tr = useTranslations("repertoire");
  const tp = useTranslations("setlists.playedPresets");
  const router = useRouter();

  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist ?? "");
  const [keyNote, setKeyNote] = useState(song.key_note === null || song.key_note === undefined ? "" : String(song.key_note));
  const [keyMode, setKeyMode] = useState<MusicalMode | "">(song.key_mode ?? "");
  const [bpm, setBpm] = useState(song.bpm ? String(song.bpm) : "");
  const [tuning, setTuning] = useState(song.tuning ?? "");
  const [capo, setCapo] = useState(song.capo ? String(song.capo) : "");
  const [parts, setParts] = useState<FormPart[]>(() =>
    partsFromSections(song.structure).map((part, index) => ({ ...part, localId: index }))
  );
  const [nextId, setNextId] = useState(song.structure.length);
  const [notes, setNotes] = useState(song.notes ?? "");
  const [tabsUrl, setTabsUrl] = useState(song.tabs_url ?? "");
  const [referenceUrl, setReferenceUrl] = useState(song.reference_url ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  const updatePart = (localId: number, change: Partial<StructurePart>) =>
    setParts((current) => current.map((part) => (part.localId === localId ? { ...part, ...change } : part)));

  const movePart = (index: number, offset: -1 | 1) =>
    setParts((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const addPart = () => {
    setParts((current) => [...current, { localId: nextId, name: "", measures: 8 }]);
    setNextId(nextId + 1);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setConflict(false);

    const result = await updateBandSong(
      song.id,
      {
        title,
        artist: artist || null,
        key_note: keyNote === "" ? null : Number(keyNote),
        key_mode: keyMode || null,
        bpm: numberOrNull(bpm),
        tuning: tuning || null,
        capo: numberOrNull(capo),
        structure: sectionsFromParts(parts),
        notes: notes || null,
        tabs_url: tabsUrl || null,
        reference_url: referenceUrl || null,
      },
      song.updated_at
    );

    if (!result.success) {
      setError(result.error ?? null);
      setConflict(Boolean(result.conflict));
      setSaving(false);
      return;
    }
    // La page se recharge avec la nouvelle version, et remonte la vue.
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="band-song-title" className={LABEL}>{t("title")}</label>
          <input id="band-song-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} required className={INPUT} />
        </div>
        <div>
          <label htmlFor="band-song-artist" className={LABEL}>{t("artist")}</label>
          <input id="band-song-artist" value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={300} className={INPUT} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="band-song-key" className={LABEL}>{t("key")}</label>
            <select id="band-song-key" value={keyNote} onChange={(e) => setKeyNote(e.target.value)} className={INPUT}>
              <option value="">{t("noKey")}</option>
              {KEY_NOTES.map((note) => (
                <option key={note} value={note}>{tr(`notes.n${note}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="band-song-mode" className={LABEL}>{t("mode")}</label>
            <select
              id="band-song-mode"
              value={keyMode}
              onChange={(e) => setKeyMode(e.target.value as MusicalMode | "")}
              className={INPUT}
            >
              <option value="">{t("noMode")}</option>
              {KEY_MODES.map((mode) => (
                <option key={mode} value={mode}>{tr(`modes.${mode}`)}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="band-song-bpm" className={LABEL}>{t("tempo")}</label>
          <input id="band-song-bpm" type="number" inputMode="numeric" min={20} max={300} value={bpm} onChange={(e) => setBpm(e.target.value)} placeholder="120" className={INPUT} />
        </div>
        <div>
          <label htmlFor="band-song-tuning" className={LABEL}>{t("tuning")}</label>
          <input
            id="band-song-tuning"
            value={tuning}
            onChange={(e) => setTuning(e.target.value)}
            maxLength={60}
            list="band-song-tunings"
            placeholder={t("tuningPlaceholder")}
            className={INPUT}
          />
          <datalist id="band-song-tunings">
            {ALL_TUNINGS.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="band-song-capo" className={LABEL}>{t("capo")}</label>
          <input id="band-song-capo" type="number" inputMode="numeric" min={0} max={12} value={capo} onChange={(e) => setCapo(e.target.value)} placeholder="0" className={INPUT} />
        </div>
      </section>

      <section>
        <h2 className={SECTION_TITLE}>{t("structure")}</h2>
        <p className="py-2 text-xs text-muted-foreground">{t("structureHint")}</p>
        <datalist id="band-song-parts">
          {PLAYED_SECTION_PRESETS.map((preset) => (
            <option key={preset} value={tp(preset)} />
          ))}
        </datalist>
        <ol className="space-y-2">
          {parts.map((part, index) => {
            const label = part.name || String(index + 1);
            return (
              <li key={part.localId} className="grid grid-cols-[minmax(0,1fr)_84px_auto] items-end gap-2">
                <div>
                  <label htmlFor={`part-name-${part.localId}`} className={index === 0 ? LABEL : "sr-only"}>{t("partName")}</label>
                  <input
                    id={`part-name-${part.localId}`}
                    value={part.name}
                    onChange={(e) => updatePart(part.localId, { name: e.target.value })}
                    list="band-song-parts"
                    maxLength={60}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label htmlFor={`part-measures-${part.localId}`} className={index === 0 ? LABEL : "sr-only"}>{t("partMeasures")}</label>
                  <input
                    id={`part-measures-${part.localId}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={BAND_SONG_MAX_MEASURES}
                    value={part.measures}
                    onChange={(e) => updatePart(part.localId, { measures: Math.max(1, Number(e.target.value) || 1) })}
                    className={INPUT}
                  />
                </div>
                <div className="flex">
                  <button type="button" onClick={() => movePart(index, -1)} disabled={index === 0} aria-label={t("moveUp", { name: label })} className="flex h-11 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-30">
                    <Icon name="expand_less" className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => movePart(index, 1)} disabled={index === parts.length - 1} aria-label={t("moveDown", { name: label })} className="flex h-11 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-30">
                    <Icon name="expand_more" className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setParts((current) => current.filter((item) => item.localId !== part.localId))} aria-label={t("removePart", { name: label })} className="flex h-11 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive">
                    <Icon name="close" className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
        {parts.length < BAND_SONG_MAX_PARTS && (
          <button type="button" onClick={addPart} className="mt-2 inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-border px-3.5 text-[13px] font-semibold hover:bg-accent">
            <Icon name="add" className="h-4 w-4" />
            {t("addPart")}
          </button>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <label htmlFor="band-song-notes" className={SECTION_TITLE + " block"}>{t("notes")}</label>
          <textarea
            id="band-song-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={BAND_SONG_NOTES_MAX}
            rows={5}
            placeholder={t("notesPlaceholder")}
            className="mt-3 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="band-song-tab" className={LABEL}>{t("tab")}</label>
            <input id="band-song-tab" type="url" value={tabsUrl} onChange={(e) => setTabsUrl(e.target.value)} placeholder={t("urlPlaceholder")} className={INPUT} />
          </div>
          <div>
            <label htmlFor="band-song-reference" className={LABEL}>{t("reference")}</label>
            <input id="band-song-reference" type="url" value={referenceUrl} onChange={(e) => setReferenceUrl(e.target.value)} placeholder={t("urlPlaceholder")} className={INPUT} />
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="space-y-2">
          <p className="text-sm font-semibold text-destructive">{error}</p>
          {conflict && (
            <button type="button" onClick={() => window.location.reload()} className="min-h-[44px] rounded-xl border border-border px-4 text-sm font-bold hover:bg-accent">
              {t("reload")}
            </button>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} disabled={saving} className="min-h-[48px] flex-1 rounded-xl border border-border px-4 text-sm font-bold hover:bg-accent">
          {t("cancel")}
        </button>
        <button type="submit" disabled={saving} className="min-h-[48px] flex-[2] rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
          {saving ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  );
}
