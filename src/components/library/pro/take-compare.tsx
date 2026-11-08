"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import { formatRecordingTime } from "@/lib/band-recordings";

export interface ComparableRecording {
  id: string;
  kind: "take" | "cover";
  label: string;
  date: string;
  mediaUrl: string;
  mediaType: "audio" | "video";
  durationSeconds: number | null;
  /** Le meilleur tempo tenu en session ce jour-la, s'il y en a un. */
  bpmThatDay: number | null;
}

type Mode = "side" | "ab";

/** Deux enregistrements : cote a cote, ou un seul lecteur qui bascule de A a B au meme moment. */
export function TakeCompare({ a, b, onClose }: { a: ComparableRecording; b: ComparableRecording; onClose: () => void }) {
  const t = useTranslations("library.takes.compare");
  const locale = useIntlLocale();
  const [mode, setMode] = useState<Mode>("ab");
  const [active, setActive] = useState<"a" | "b">("a");
  const [offset, setOffset] = useState(0);
  const [position, setPosition] = useState(0);
  const refA = useRef<HTMLMediaElement | null>(null);
  const refB = useRef<HTMLMediaElement | null>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Bascule : B joue « au meme moment » que A, decale de `offset` secondes.
  const switchTo = (next: "a" | "b") => {
    if (next === active) return;
    const from = active === "a" ? refA.current : refB.current;
    const to = next === "a" ? refA.current : refB.current;
    if (!from || !to) return;
    const wasPlaying = !from.paused;
    const time = active === "a" ? from.currentTime + offset : from.currentTime - offset;
    from.pause();
    to.currentTime = Math.max(0, time);
    if (wasPlaying) void to.play().catch(() => undefined);
    setActive(next);
  };

  const date = (value: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));

  const player = (recording: ComparableRecording, ref: React.RefObject<HTMLMediaElement | null>, hidden: boolean, tracking: boolean) => {
    const common = {
      ref: (element: HTMLMediaElement | null) => {
        ref.current = element;
      },
      src: recording.mediaUrl,
      controls: !hidden,
      preload: "metadata" as const,
      onTimeUpdate: tracking ? (event: React.SyntheticEvent<HTMLMediaElement>) => setPosition(event.currentTarget.currentTime) : undefined,
      className: hidden ? "hidden" : "w-full",
    };
    return recording.mediaType === "video" ? <video {...common} playsInline className={hidden ? "hidden" : "w-full rounded-lg bg-black"} /> : <audio {...common} />;
  };

  const meta = (recording: ComparableRecording, letter: string) => (
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold">
        <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded bg-foreground text-[11px] text-background">{letter}</span>
        {recording.label}
      </p>
      <p className="text-xs text-muted-foreground">
        {[
          date(recording.date),
          recording.kind === "cover" ? t("cover") : t("take"),
          recording.durationSeconds ? formatRecordingTime(recording.durationSeconds) : null,
          recording.bpmThatDay ? t("bpmThatDay", { bpm: recording.bpmThatDay }) : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="take-compare-title" className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-md">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="take-compare-title" className="font-display text-2xl font-extrabold uppercase leading-none">{t("title")}</h2>
          <button type="button" onClick={onClose} className="min-h-[36px] rounded-full px-3 text-sm font-semibold hover:bg-accent">
            {t("close")}
          </button>
        </div>

        <div className="mb-4 flex gap-2" role="tablist">
          {(["ab", "side"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => {
                refA.current?.pause();
                refB.current?.pause();
                setMode(value);
              }}
              className={`min-h-[36px] rounded-full border px-3 text-[13px] font-semibold ${mode === value ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent"}`}
            >
              {t(value === "ab" ? "modeAb" : "modeSide")}
            </button>
          ))}
        </div>

        {mode === "side" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">{meta(a, "A")}{player(a, refA, false, false)}</div>
            <div className="space-y-2">{meta(b, "B")}{player(b, refB, false, false)}</div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {meta(a, "A")}
              {meta(b, "B")}
            </div>
            {player(a, refA, active !== "a", active === "a")}
            {player(b, refB, active !== "b", active === "b")}
            <div className="flex items-center gap-2" role="group" aria-label={t("switchLabel")}>
              {(["a", "b"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active === value}
                  onClick={() => switchTo(value)}
                  className={`min-h-[48px] flex-1 rounded-xl border text-base font-extrabold ${active === value ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent"}`}
                >
                  {value.toUpperCase()}
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground tabular">{t("position", { time: formatRecordingTime(position) })}</p>
            <div>
              <label htmlFor="take-offset" className="text-xs font-semibold text-muted-foreground">
                {t("offset", { seconds: offset.toFixed(1) })}
              </label>
              <input
                id="take-offset"
                type="range"
                min={-30}
                max={30}
                step={0.1}
                value={offset}
                onChange={(event) => setOffset(Number(event.target.value))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">{t("offsetHint")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
