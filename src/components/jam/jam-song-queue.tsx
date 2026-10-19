"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { SetlistWithDetails, SetlistItem } from "@/types";

interface JamSongQueueProps {
  setlist: SetlistWithDetails;
  currentIndex: number | null;
  isHost: boolean;
  onSongSelect: (index: number, item: SetlistItem) => void;
}

export function JamSongQueue({
  setlist,
  currentIndex,
  isHost,
  onSongSelect,
}: JamSongQueueProps) {
  const t = useTranslations("jam.queue");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  // Elements jouables de la setlist : morceaux + exercices (pas les sections)
  const items = setlist.items.filter(
    (item) => item.item_type === "song" || item.item_type === "exercise"
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border p-3">
        <h3 className="font-semibold">
          {t("setlist", { name: setlist.name })}{" "}
          <span className="text-muted-foreground font-normal">
            {t("items", { count: items.length })}
          </span>
        </h3>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {items.map((item, index) => {
          const isCurrent = currentIndex === index;
          const position = index + 1;
          const isExercise = item.item_type === "exercise";

          return (
            <button
              key={item.id}
              onClick={() => isHost && onSongSelect(index, item)}
              disabled={!isHost}
              className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                isCurrent
                  ? "bg-primary/20"
                  : isHost
                  ? "hover:bg-accent/50"
                  : ""
              } ${!isHost ? "cursor-default" : ""}`}
            >
              {/* Position / Playing indicator */}
              <div
                className={`h-8 w-8 shrink-0 flex items-center justify-center rounded-lg text-sm font-medium ${
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-muted-foreground"
                }`}
              >
                {isCurrent ? (
                  <svg
                    className="h-4 w-4 animate-pulse"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  position
                )}
              </div>

              {/* Cover art / exercise icon */}
              {isExercise ? (
                <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.5 6.5l11 11m-9-13l2 2m-4 0l4 4m9 1l-2-2m4 0l-4-4M3 21l2-2m14-14l2-2"
                    />
                  </svg>
                </div>
              ) : item.song_cover_url ? (
                <Image
                  src={item.song_cover_url}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  width={40}
                  height={40}
                />
              ) : (
                <div className="h-10 w-10 shrink-0 rounded-lg bg-accent flex items-center justify-center">
                  <svg
                    className="h-5 w-5 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                </div>
              )}

              {/* Song / exercise info */}
              <div className="flex-1 min-w-0">
                <p
                  className={`truncate font-medium ${
                    isCurrent ? "text-primary" : ""
                  }`}
                >
                  {isExercise ? item.exercise_name : item.song_title}
                </p>
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm text-muted-foreground">
                    {isExercise
                      ? item.exercise_category
                        ? te(`exerciseCategory.${item.exercise_category}`)
                        : tc("exercise")
                      : item.song_artist}
                  </p>
                  {!isExercise && item.tabs_url && (
                    <span className="shrink-0 rounded-full bg-chart-2/20 px-1.5 py-0.5 text-[11px] font-medium text-chart-2">
                      {t("tab")}
                    </span>
                  )}
                  {!isExercise &&
                    item.played_sections &&
                    item.played_sections.length > 0 && (
                      <span className="shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em]">
                        {item.played_sections.length} sect.
                      </span>
                    )}
                </div>
              </div>

              {/* BPM indicator */}
              {item.bpm && item.bpm > 0 && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {item.bpm} bpm
                </span>
              )}

              {/* Current indicator */}
              {isCurrent && (
                <span className="shrink-0 text-xs font-medium text-primary">
                  {t("current")}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
