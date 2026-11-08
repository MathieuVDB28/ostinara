"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { ProUpsell } from "@/components/subscription/pro-upsell";
import { useIntlLocale } from "@/i18n/intl-locale";
import { createSongTake, deleteSongTake, getSongTakes } from "@/lib/actions/pro";
import { canUploadCover } from "@/lib/actions/covers";
import { BAND_RECORDING_MAX_FILE_BYTES, formatRecordingTime, recordingMediaType } from "@/lib/band-recordings";
import { readMediaDuration, uploadSongTakeFile } from "@/lib/band-recording-upload";
import { useLongRecorder } from "@/lib/hooks/use-long-recorder";
import { TakeCompare, type ComparableRecording } from "./take-compare";
import type { Cover, Instrument, SongBpmPoint, SongTake, UserPlan } from "@/types";

interface SongTakesPanelProps {
  songId: string;
  songTitle: string;
  instrument: Instrument;
  covers: Cover[];
  points: SongBpmPoint[] | null;
  userPlan: UserPlan;
}

/** Les prises privees d'un morceau et ses covers, a comparer deux a deux. */
export function SongTakesPanel({ songId, songTitle, instrument, covers, points, userPlan }: SongTakesPanelProps) {
  const t = useTranslations("library.takes");
  const locale = useIntlLocale();
  const isPro = userPlan !== "free";
  const [takes, setTakes] = useState<SongTake[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSongTakes(songId).then((rows) => {
      if (!cancelled) setTakes(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [songId]);

  // Le meilleur tempo tenu en session, jour par jour.
  const bpmByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const point of points ?? []) {
      const day = point.date.slice(0, 10);
      map.set(day, Math.max(map.get(day) ?? 0, point.bpm));
    }
    return map;
  }, [points]);

  const items: ComparableRecording[] = useMemo(() => {
    const fromTakes = (takes ?? [])
      .filter((take) => take.media_url)
      .map((take) => ({
        id: `take:${take.id}`,
        kind: "take" as const,
        label: take.title || t("defaultTitle"),
        date: take.recorded_at,
        mediaUrl: take.media_url as string,
        mediaType: take.media_type,
        durationSeconds: take.duration_seconds,
        bpmThatDay: bpmByDay.get(take.recorded_at.slice(0, 10)) ?? null,
      }));
    const fromCovers = covers
      .filter((cover) => cover.media_url)
      .map((cover) => ({
        id: `cover:${cover.id}`,
        kind: "cover" as const,
        label: cover.description?.trim() || t("coverTitle"),
        date: cover.created_at,
        mediaUrl: cover.media_url,
        mediaType: cover.media_type,
        durationSeconds: cover.duration_seconds ?? null,
        bpmThatDay: bpmByDay.get(cover.created_at.slice(0, 10)) ?? null,
      }));
    return [...fromTakes, ...fromCovers].sort((x, y) => y.date.localeCompare(x.date));
  }, [takes, covers, bpmByDay, t]);

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current.slice(-1), id]
    );

  const remove = async (takeId: string) => {
    if (!window.confirm(t("deleteConfirm"))) return;
    const result = await deleteSongTake(takeId);
    if (!result.success) {
      setError(result.error ?? null);
      return;
    }
    setTakes((current) => (current ?? []).filter((take) => take.id !== takeId));
    setSelected((current) => current.filter((id) => id !== `take:${takeId}`));
  };

  // A est le plus ancien : on compare d'avant a maintenant.
  const pair = selected
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is ComparableRecording => Boolean(item))
    .sort((x, y) => x.date.localeCompare(y.date));

  const date = (value: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
        {isPro && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Icon name="add" className="h-4 w-4" />
            {t("add")}
          </button>
        )}
      </div>

      {!isPro && <ProUpsell compact feature={t("upsell")} description="" />}

      {adding && (
        <AddTakeForm
          songId={songId}
          songTitle={songTitle}
          instrument={instrument}
          onCancel={() => setAdding(false)}
          onAdded={(take) => {
            setTakes((current) => [take, ...(current ?? [])]);
            setAdding(false);
          }}
        />
      )}

      {takes === null ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : items.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <>
          <ul className="border-t border-border">
            {items.map((item) => {
              const checked = selected.includes(item.id);
              return (
                <li key={item.id} className="flex items-center gap-3 border-b border-border py-2.5">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(item.id)}
                    aria-label={t("select", { name: item.label })}
                    className="h-5 w-5 shrink-0"
                  />
                  <Icon name={item.mediaType === "video" ? "videocam" : "audiotrack"} className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{item.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[
                        date(item.date),
                        item.kind === "cover" ? t("coverTag") : t("takeTag"),
                        item.durationSeconds ? formatRecordingTime(item.durationSeconds) : null,
                        item.bpmThatDay ? t("bpmThatDay", { bpm: item.bpmThatDay }) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {item.kind === "take" && (
                    <button
                      type="button"
                      onClick={() => void remove(item.id.slice(5))}
                      aria-label={t("delete", { name: item.label })}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive"
                    >
                      <Icon name="delete" className="h-4 w-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{t("selectHint", { count: selected.length })}</p>
            <button
              type="button"
              disabled={pair.length !== 2 || !isPro}
              onClick={() => setComparing(true)}
              className="min-h-[40px] rounded-full bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-40"
            >
              {t("compareAction")}
            </button>
          </div>
        </>
      )}

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {comparing && pair.length === 2 && <TakeCompare a={pair[0]} b={pair[1]} onClose={() => setComparing(false)} />}
    </div>
  );
}

/** Une prise au micro ou depuis un fichier (audio ou video). */
function AddTakeForm({
  songId,
  songTitle,
  instrument,
  onCancel,
  onAdded,
}: {
  songId: string;
  songTitle: string;
  instrument: Instrument;
  onCancel: () => void;
  onAdded: (take: SongTake) => void;
}) {
  const t = useTranslations("library.takes");
  const tm = useTranslations("recordings.mic");
  const recorder = useLongRecorder();
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<"mic" | "file">("mic");
  const [file, setFile] = useState<{ blob: Blob; name: string | null; mimeType: string; duration: number | null } | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const take = recorder.result;
  const pending = source === "mic"
    ? take ? { blob: take.blob, name: null, mimeType: take.mimeType, duration: take.durationSeconds } : null
    : file;

  const pick = async (picked: File) => {
    setError(null);
    const kind = recordingMediaType(picked.type);
    if (!kind) return setError(t("wrongType"));
    if (picked.size > BAND_RECORDING_MAX_FILE_BYTES) return setError(t("tooLarge"));
    setFile({ blob: picked, name: picked.name, mimeType: picked.type, duration: await readMediaDuration(picked, kind) });
  };

  const save = async () => {
    if (!pending || busy) return;
    setBusy(true);
    setError(null);
    try {
      let blob = pending.blob;
      let mimeType = pending.mimeType;
      if (blob instanceof File && recordingMediaType(mimeType) === "video") {
        const { needsCompression } = await import("@/lib/video-compression");
        if (needsCompression(blob)) {
          setStatus(t("compressing", { p: 0 }));
          const { compressVideo } = await import("@/lib/video-compression");
          blob = await compressVideo(blob, (p) => setStatus(t("compressing", { p })));
          mimeType = blob.type || "video/mp4";
        }
      }
      const quota = await canUploadCover(blob.size);
      if (!quota.allowed) {
        setError(quota.reason ?? t("failed"));
        return;
      }
      const path = await uploadSongTakeFile(songId, blob, {
        name: blob instanceof File ? blob.name : pending.name,
        mimeType,
        onProgress: (p) => setStatus(t("uploading", { p })),
      });
      const result = await createSongTake({
        songId,
        instrument,
        title: title || null,
        mediaPath: path,
        mimeType,
        durationSeconds: pending.duration,
        fileSizeBytes: blob.size,
      });
      if (!result.success || !result.take) {
        setError(result.error ?? t("failed"));
        return;
      }
      onAdded(result.take);
    } catch (caught) {
      console.error("Take upload failed:", caught);
      setError(t("failed"));
    } finally {
      setBusy(false);
      setStatus(null);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex gap-2">
        {(["mic", "file"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={source === value}
            disabled={busy || recorder.recording}
            onClick={() => {
              setSource(value);
              setFile(null);
              recorder.reset();
            }}
            className={`flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-semibold ${source === value ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent"}`}
          >
            <Icon name={value === "mic" ? "mic" : "cloud_upload"} className="h-4 w-4" />
            {t(value === "mic" ? "sourceMic" : "sourceFile")}
          </button>
        ))}
      </div>

      {source === "mic" ? (
        <div className="text-center">
          {recorder.recording ? (
            <>
              <p className="font-display text-3xl font-extrabold tabular">{formatRecordingTime(recorder.elapsed)}</p>
              <button type="button" onClick={recorder.stop} className="mt-2 inline-flex min-h-[40px] items-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background">
                <Icon name="stop" className="h-4 w-4" />
                {tm("stop")}
              </button>
            </>
          ) : take ? (
            <p className="text-sm">
              {tm("ready", { duration: formatRecordingTime(take.durationSeconds) })}{" "}
              <button type="button" onClick={recorder.reset} className="font-semibold hover:underline">{tm("redo")}</button>
            </p>
          ) : (
            <>
              <button type="button" onClick={() => void recorder.start()} className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background">
                <Icon name="mic" className="h-4 w-4" />
                {tm("start")}
              </button>
              {recorder.error && <p className="mt-2 text-sm text-destructive">{tm(recorder.error)}</p>}
            </>
          )}
        </div>
      ) : (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,video/*"
            className="hidden"
            onChange={(event) => {
              const picked = event.target.files?.[0];
              if (picked) void pick(picked);
              event.target.value = "";
            }}
          />
          <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-accent">
            <Icon name="cloud_upload" className="h-4 w-4" />
            {file ? file.name : t("chooseFile")}
          </button>
        </div>
      )}

      <div>
        <label htmlFor="take-title" className="mb-1 block text-xs font-semibold text-muted-foreground">{t("titleLabel")}</label>
        <input
          id="take-title"
          value={title}
          maxLength={120}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("titlePlaceholder", { song: songTitle })}
          className="min-h-[40px] w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-primary"
        />
      </div>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {status && <p className="text-sm text-muted-foreground" aria-live="polite">{status}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={busy || recorder.recording} className="min-h-[40px] rounded-full px-4 text-sm font-semibold hover:bg-accent disabled:opacity-40">
          {t("cancel")}
        </button>
        <button type="button" onClick={() => void save()} disabled={!pending || busy || recorder.recording} className="min-h-[40px] rounded-full bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-40">
          {busy ? t("saving") : t("save")}
        </button>
      </div>
    </div>
  );
}
