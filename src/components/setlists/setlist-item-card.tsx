"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SetlistItemWithSongOwner } from "@/types";

interface SetlistItemCardProps {
  item: SetlistItemWithSongOwner;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function getSectionIcon(name?: string) {
  const lowerName = name?.toLowerCase() || "";
  if (lowerName.includes("intro")) {
    return (
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
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }
  if (lowerName.includes("pause")) {
    return (
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
          d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }
  if (lowerName.includes("rappel")) {
    return (
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
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    );
  }
  if (lowerName.includes("outro")) {
    return (
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
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
        />
      </svg>
    );
  }
  // Default section icon
  return (
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
        d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
      />
    </svg>
  );
}

function getSectionColor(name?: string) {
  const lowerName = name?.toLowerCase() || "";
  if (lowerName.includes("intro")) return "bg-blue-500/20 text-blue-400";
  if (lowerName.includes("pause")) return "bg-yellow-500/20 text-yellow-400";
  if (lowerName.includes("rappel")) return "bg-purple-500/20 text-purple-400";
  if (lowerName.includes("outro")) return "bg-red-500/20 text-red-400";
  if (lowerName.includes("medley")) return "bg-green-500/20 text-green-400";
  if (lowerName.includes("acoustique"))
    return "bg-amber-500/20 text-amber-400";
  return "bg-muted text-muted-foreground";
}

export function SetlistItemCard({
  item,
  index,
  onEdit,
  onDelete,
}: SetlistItemCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isSong = item.item_type === "song";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors ${
        isDragging ? "border-primary shadow-lg" : "border-border"
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing"
      >
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
            d="M4 8h16M4 16h16"
          />
        </svg>
      </button>

      {/* Position number */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
        {index + 1}
      </div>

      {/* Content */}
      {isSong ? (
        <>
          {/* Song cover */}
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
            {item.song_cover_url ? (
              <img
                src={item.song_cover_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <svg
                  className="h-6 w-6"
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
          </div>

          {/* Song info */}
          <div className="flex-1 min-w-0">
            <p className="truncate font-medium">{item.song_title}</p>
            <p className="truncate text-sm text-muted-foreground">
              {item.song_artist}
            </p>
          </div>
        </>
      ) : (
        <>
          {/* Section icon */}
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${getSectionColor(
              item.section_name
            )}`}
          >
            {getSectionIcon(item.section_name)}
          </div>

          {/* Section info */}
          <div className="flex-1 min-w-0">
            <p className="truncate font-medium">{item.section_name}</p>
            <p className="text-sm text-muted-foreground">Section</p>
          </div>
        </>
      )}

      {/* Duration */}
      {item.duration_seconds && (
        <div className="shrink-0 text-sm text-muted-foreground">
          {formatDuration(item.duration_seconds)}
        </div>
      )}

      {/* Transition badge */}
      {item.transition_seconds > 0 && (
        <div className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          +{item.transition_seconds}s
        </div>
      )}

      {/* Notes indicator */}
      {item.notes && (
        <div className="shrink-0 text-primary" title={item.notes}>
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
        </div>
      )}

      {/* Actions (visible on hover) */}
      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={onEdit}
          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
