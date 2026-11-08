"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { useIntlLocale } from "@/i18n/intl-locale";
import {
  canUploadBandRecording,
  createBandRecording,
  getRecordingLinkOptions,
} from "@/lib/actions/band-recordings";
import {
  BAND_RECORDING_KINDS,
  BAND_RECORDING_MAX_FILE_BYTES,
  BAND_RECORDING_NOTE_MAX,
  BAND_RECORDING_TITLE_MAX,
  bandRecordingHref,
  formatBytes,
  formatRecordingTime,
  recordingMediaType,
  type BandRecordingKind,
} from "@/lib/band-recordings";
import { readMediaDuration, uploadBandRecordingFile } from "@/lib/band-recording-upload";
import { useLongRecorder } from "@/lib/hooks/use-long-recorder";

export interface RecordingDefaults {
  title?: string;
  kind?: BandRecordingKind;
  bandSongId?: string | null;
  rehearsalId?: string | null;
}

interface AddRecordingModalProps {
  bandId: string;
  defaults?: RecordingDefaults;
  onClose: () => void;
}

interface Pending {
  blob: Blob;
  name: string | null;
  mimeType: string;
  mediaType: "audio" | "video";
  durationSeconds: number | null;
}

type Source = "file" | "mic";

const INPUT =
  "min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm focus:border-primary";
const LABEL = "mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground";

/** Ajouter un enregistrement au groupe : un fichier ou une prise au micro, puis ses infos. */
export function AddRecordingModal({ bandId, defaults, onClose }: AddRecordingModalProps) {
  const t = useTranslations("recordings");
  const ta = useTranslations("recordings.addModal");
  const tm = useTranslations("recordings.mic");
  const locale = useIntlLocale();
  const router = useRouter();
  const recorder = useLongRecorder();
  const inputRef = useRef<HTMLInputElement>(null);

  const [source, setSource] = useState<Source>("file");
  const [pending, setPending] = useState<Pending | null>(null);
  const [title, setTitle] = useState(defaults?.title ?? "");
  const [kind, setKind] = useState<BandRecordingKind>(defaults?.kind ?? "demo");
  const [note, setNote] = useState("");
  const [bandSongId, setBandSongId] = useState(defaults?.bandSongId ?? "");
  const [rehearsalId, setRehearsalId] = useState(defaults?.rehearsalId ?? "");
  const [options, setOptions] = useState<Awaited<ReturnType<typeof getRecordingLinkOptions>> | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy && !recorder.recording) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose, busy, recorder.recording]);

  // Une prise au micro terminee devient le fichier a envoyer.
  const take = recorder.result;
  useEffect(() => {
    if (!take) return;
    setPending({
      blob: take.blob,
      name: null,
      mimeType: take.mimeType,
      mediaType: "audio",
      durationSeconds: take.durationSeconds,
    });
  }, [take]);

  const chooseSource = (next: Source) => {
    if (busy || recorder.recording) return;
    setSource(next);
    setPending(null);
    setError(null);
    recorder.reset();
  };

  const handleFile = async (file: File) => {
    setError(null);
    const mediaType = recordingMediaType(file.type);
    if (!mediaType) {
      setError(ta("wrongType"));
      return;
    }
    if (file.size > BAND_RECORDING_MAX_FILE_BYTES) {
      setError(ta("tooLarge"));
      return;
    }
    const durationSeconds = await readMediaDuration(file, mediaType);
    setPending({ blob: file, name: file.name, mimeType: file.type, mediaType, durationSeconds });
    if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, "").slice(0, BAND_RECORDING_TITLE_MAX));
  };

  const save = async () => {
    if (!pending || busy || !title.trim()) return;
    setBusy(true);
    setError(null);

    try {
      let blob = pending.blob;
      let mimeType = pending.mimeType;

      // Comme pour les covers : une video lourde est compressee avant l'envoi.
      if (pending.mediaType === "video" && blob instanceof File) {
        const { needsCompression } = await import("@/lib/video-compression");
        if (needsCompression(blob)) {
          setStatus(ta("compressionLoading"));
          const { compressVideo } = await import("@/lib/video-compression");
          blob = await compressVideo(
            blob,
            (p) => setStatus(ta("compressing", { p })),
            () => setStatus(ta("compressionLoading"))
          );
          mimeType = blob.type || "video/mp4";
        }
      }

      const quota = await canUploadBandRecording(bandId, blob.size);
      if (!quota.allowed) {
        setError(quota.reason ?? ta("failed"));
        return;
      }

      setStatus(ta("uploading", { p: 0 }));
      const path = await uploadBandRecordingFile(bandId, blob, {
        name: blob instanceof File ? blob.name : pending.name,
        mimeType,
        onProgress: (p) => setStatus(ta("uploading", { p })),
      });

      const result = await createBandRecording(bandId, {
        title,
        kind,
        note,
        band_song_id: bandSongId || null,
        rehearsal_id: rehearsalId || null,
        media_path: path,
        mime_type: mimeType,
        duration_seconds: pending.durationSeconds,
        file_size_bytes: blob.size,
      });
      if (!result.success || !result.recordingId) {
        setError(result.error ?? ta("failed"));
        return;
      }
      router.push(bandRecordingHref(bandId, result.recordingId));
    } catch (caught) {
      console.error("Band recording upload failed:", caught);
      setError(ta("failed"));
    } finally {
      setBusy(false);
      setStatus(null);
    }
  };

  const dateFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });
  const tabClass = (active: boolean) =>
    `flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors ${
      active ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => !busy && !recorder.recording && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-recording-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-md"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="add-recording-title" className="font-display text-3xl font-extrabold uppercase leading-none">
              {ta("title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{ta("hint")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy || recorder.recording}
            aria-label={ta("close")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2" role="tablist">
          <button type="button" role="tab" aria-selected={source === "file"} onClick={() => chooseSource("file")} className={tabClass(source === "file")}>
            <Icon name="cloud_upload" className="h-4 w-4" />
            {ta("sourceFile")}
          </button>
          <button type="button" role="tab" aria-selected={source === "mic"} onClick={() => chooseSource("mic")} className={tabClass(source === "mic")}>
            <Icon name="mic" className="h-4 w-4" />
            {ta("sourceMic")}
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-border p-4">
          {source === "file" ? (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleFile(file);
                  event.target.value = "";
                }}
              />
              {pending ? (
                <div className="flex items-center gap-3">
                  <Icon name={pending.mediaType === "video" ? "videocam" : "audiotrack"} className="h-5 w-5 shrink-0" />
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {ta("fileReady", { name: pending.name ?? "", size: formatBytes(pending.blob.size, locale) })}
                    {pending.durationSeconds !== null && (
                      <span className="font-normal text-muted-foreground"> · {formatRecordingTime(pending.durationSeconds)}</span>
                    )}
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => inputRef.current?.click()}
                    className="shrink-0 text-xs font-semibold hover:underline disabled:opacity-40"
                  >
                    {ta("change")}
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-accent"
                  >
                    <Icon name="cloud_upload" className="h-4 w-4" />
                    {ta("chooseFile")}
                  </button>
                  <p className="mt-2 text-xs text-muted-foreground">{ta("dropHint")}</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center">
              {recorder.recording ? (
                <>
                  <p className="flex items-center justify-center gap-2 text-sm font-semibold">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" aria-hidden="true" />
                    {tm("recording")}
                  </p>
                  <p className="mt-1 font-display text-4xl font-extrabold tabular" aria-live="off">
                    {formatRecordingTime(recorder.elapsed)}
                  </p>
                  <button
                    type="button"
                    onClick={recorder.stop}
                    className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background"
                  >
                    <Icon name="stop" className="h-4 w-4" />
                    {tm("stop")}
                  </button>
                  <p className="mt-2 text-xs text-muted-foreground">{tm("keepOpen")}</p>
                </>
              ) : pending ? (
                <>
                  <p className="text-sm font-semibold">
                    {tm("ready", { duration: formatRecordingTime(pending.durationSeconds) })}
                  </p>
                  {recorder.maxReached && <p className="mt-1 text-xs text-muted-foreground">{tm("maxReached")}</p>}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setPending(null);
                      recorder.reset();
                    }}
                    className="mt-2 text-xs font-semibold hover:underline disabled:opacity-40"
                  >
                    {tm("redo")}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void recorder.start()}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background"
                  >
                    <Icon name="mic" className="h-4 w-4" />
                    {tm("start")}
                  </button>
                  {recorder.error && (
                    <p className="mt-2 text-sm text-destructive">{tm(recorder.error)}</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="recording-title" className={LABEL}>{ta("titleLabel")}</label>
            <input
              id="recording-title"
              value={title}
              maxLength={BAND_RECORDING_TITLE_MAX}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={ta("titlePlaceholder")}
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
              <label htmlFor="recording-song" className={LABEL}>{ta("songLabel")}</label>
              <select id="recording-song" value={bandSongId} onChange={(event) => setBandSongId(event.target.value)} className={INPUT}>
                <option value="">{ta("noSong")}</option>
                {options?.songs.map((song) => (
                  <option key={song.id} value={song.id}>
                    {song.artist ? `${song.title} · ${song.artist}` : song.title}
                  </option>
                ))}
                {/* La valeur par defaut reste choisie le temps que la liste arrive. */}
                {!options && bandSongId && <option value={bandSongId}>{defaults?.title ?? "…"}</option>}
              </select>
            </div>
            <div>
              <label htmlFor="recording-rehearsal" className={LABEL}>{ta("rehearsalLabel")}</label>
              <select id="recording-rehearsal" value={rehearsalId} onChange={(event) => setRehearsalId(event.target.value)} className={INPUT}>
                <option value="">{ta("noRehearsal")}</option>
                {options?.rehearsals.map((rehearsal) => (
                  <option key={rehearsal.id} value={rehearsal.id}>
                    {ta("rehearsalOption", {
                      title: rehearsal.title || t("kinds.rehearsal"),
                      date: dateFormat.format(new Date(rehearsal.date)),
                    })}
                  </option>
                ))}
                {!options && rehearsalId && <option value={rehearsalId}>…</option>}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="recording-note" className={LABEL}>{ta("noteLabel")}</label>
            <textarea
              id="recording-note"
              value={note}
              maxLength={BAND_RECORDING_NOTE_MAX}
              onChange={(event) => setNote(event.target.value)}
              placeholder={ta("notePlaceholder")}
              rows={3}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
        {status && <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">{status}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy || recorder.recording}
            className="min-h-[44px] rounded-full px-4 text-sm font-semibold hover:bg-accent disabled:opacity-40"
          >
            {ta("cancel")}
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!pending || busy || recorder.recording || !title.trim()}
            className="min-h-[44px] rounded-full bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-40"
          >
            {busy ? ta("saving") : ta("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
