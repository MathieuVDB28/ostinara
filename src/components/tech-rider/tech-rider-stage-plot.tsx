"use client";

import { useState, useRef, useCallback } from "react";
import type { TechRiderMusician, TechRiderStageElement } from "@/types";

interface Props {
  musicians: TechRiderMusician[];
  stageElements: TechRiderStageElement[];
  onUpdateMusicianPosition: (id: string, x: number, y: number) => void;
  onUpdateElementPosition: (id: string, x: number, y: number) => void;
  onAddElement: (element: TechRiderStageElement) => void;
  onRemoveElement: (id: string) => void;
  readOnly?: boolean;
}

const ELEMENT_LABELS: Record<TechRiderStageElement["type"], string> = {
  monitor: "Retour",
  amp: "Ampli",
  drums: "Batterie",
  keyboard: "Clavier",
  di_box: "DI Box",
  mic_stand: "Micro",
  custom: "Autre",
};

const ELEMENT_COLORS: Record<TechRiderStageElement["type"], string> = {
  monitor: "bg-blue-500",
  amp: "bg-zinc-500",
  drums: "bg-red-500",
  keyboard: "bg-purple-500",
  di_box: "bg-green-500",
  mic_stand: "bg-orange-500",
  custom: "bg-zinc-400",
};

const ELEMENT_SHAPES: Record<TechRiderStageElement["type"], string> = {
  monitor: "rotate-45 h-5 w-5 rounded-sm",
  amp: "h-6 w-8 rounded-sm",
  drums: "h-8 w-8 rounded-full",
  keyboard: "h-5 w-10 rounded-sm",
  di_box: "h-5 w-5 rounded-sm",
  mic_stand: "h-6 w-6 rounded-full",
  custom: "h-6 w-6 rounded",
};

export function TechRiderStagePlot({
  musicians,
  stageElements,
  onUpdateMusicianPosition,
  onUpdateElementPosition,
  onAddElement,
  onRemoveElement,
  readOnly,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{
    type: "musician" | "element";
    id: string;
  } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const getStageCoords = useCallback(
    (e: React.PointerEvent) => {
      if (!stageRef.current) return { x: 50, y: 50 };
      const rect = stageRef.current.getBoundingClientRect();
      const x = Math.max(
        5,
        Math.min(95, ((e.clientX - rect.left) / rect.width) * 100)
      );
      const y = Math.max(
        5,
        Math.min(95, ((e.clientY - rect.top) / rect.height) * 100)
      );
      return { x, y };
    },
    []
  );

  const handlePointerDown = useCallback(
    (type: "musician" | "element", id: string, e: React.PointerEvent) => {
      if (readOnly) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragging({ type, id });
      setSelected(id);
    },
    [readOnly]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const { x, y } = getStageCoords(e);
      if (dragging.type === "musician") {
        onUpdateMusicianPosition(dragging.id, x, y);
      } else {
        onUpdateElementPosition(dragging.id, x, y);
      }
    },
    [dragging, getStageCoords, onUpdateMusicianPosition, onUpdateElementPosition]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleStageClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === stageRef.current) {
        setSelected(null);
      }
    },
    []
  );

  const addElement = (type: TechRiderStageElement["type"]) => {
    const element: TechRiderStageElement = {
      id: crypto.randomUUID(),
      type,
      label: ELEMENT_LABELS[type],
      x: 40 + Math.random() * 20,
      y: 40 + Math.random() * 20,
    };
    onAddElement(element);
    setSelected(element.id);
  };

  const selectedIsElement = stageElements.some((e) => e.id === selected);

  return (
    <div className="space-y-3">
      {/* Add elements toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Ajouter :
          </span>
          {(
            [
              "monitor",
              "amp",
              "drums",
              "keyboard",
              "di_box",
              "mic_stand",
              "custom",
            ] as const
          ).map((type) => (
            <button
              key={type}
              onClick={() => addElement(type)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
            >
              <span
                className={`inline-block h-3 w-3 rounded-sm ${ELEMENT_COLORS[type]}`}
              />
              {ELEMENT_LABELS[type]}
            </button>
          ))}
        </div>
      )}

      {/* Stage area */}
      <div
        ref={stageRef}
        className="relative w-full select-none overflow-hidden rounded-xl border-2 border-zinc-700 bg-zinc-900"
        style={{ aspectRatio: "16 / 9" }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleStageClick}
      >
        {/* Stage boundary markers */}
        <div className="absolute inset-x-4 top-3 border-t border-dashed border-zinc-700" />
        <div className="absolute inset-x-4 bottom-3 border-t border-dashed border-zinc-700" />

        {/* Labels */}
        <div className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-600">
          Fond de scene
        </div>
        <div className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-600">
          Public
        </div>
        <div className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-[11px] font-medium text-zinc-700 [writing-mode:vertical-lr]">
          Cour (SR)
        </div>
        <div className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 rotate-180 text-[11px] font-medium text-zinc-700 [writing-mode:vertical-lr]">
          Jardin (SL)
        </div>

        {/* Empty state */}
        {musicians.length === 0 && stageElements.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-zinc-600">
              Ajoute des musiciens et des elements pour construire ton plan
            </p>
          </div>
        )}

        {/* Musicians */}
        {musicians.map((m) => (
          <div
            key={m.id}
            className={`absolute z-10 flex flex-col items-center ${
              readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing"
            } ${selected === m.id ? "z-20" : ""}`}
            style={{
              left: `${m.position_x}%`,
              top: `${m.position_y}%`,
              transform: "translate(-50%, -50%)",
            }}
            onPointerDown={(e) => handlePointerDown("musician", m.id, e)}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full bg-primary/90 text-sm font-bold text-primary-foreground shadow-lg transition-all ${
                selected === m.id
                  ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900"
                  : ""
              }`}
            >
              {m.name?.[0]?.toUpperCase() || "?"}
            </div>
            <span className="mt-1 max-w-20 truncate rounded bg-black/60 px-1.5 py-0.5 text-center text-[11px] font-medium leading-tight text-white">
              {m.name || "Sans nom"}
            </span>
            <span className="max-w-20 truncate text-[11px] text-zinc-400">
              {m.instrument}
            </span>
          </div>
        ))}

        {/* Stage elements */}
        {stageElements.map((el) => (
          <div
            key={el.id}
            className={`absolute z-10 flex flex-col items-center ${
              readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing"
            } ${selected === el.id ? "z-20" : ""}`}
            style={{
              left: `${el.x}%`,
              top: `${el.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            onPointerDown={(e) => handlePointerDown("element", el.id, e)}
          >
            <div
              className={`flex items-center justify-center ${ELEMENT_SHAPES[el.type]} ${ELEMENT_COLORS[el.type]} shadow-md transition-all ${
                selected === el.id
                  ? "ring-2 ring-white ring-offset-1 ring-offset-zinc-900"
                  : "opacity-80"
              }`}
            />
            <span
              className={`mt-1 max-w-20 truncate rounded bg-black/60 px-1 py-0.5 text-center text-[11px] font-medium leading-tight text-white ${
                el.type === "monitor" ? "-mt-0" : ""
              }`}
            >
              {el.label}
            </span>
          </div>
        ))}
      </div>

      {/* Delete selected element */}
      {!readOnly && selected && selectedIsElement && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onRemoveElement(selected);
              setSelected(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/50 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <svg
              className="h-3.5 w-3.5"
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
            Supprimer l&apos;element selectionne
          </button>
          <span className="text-xs text-muted-foreground">
            ({stageElements.find((e) => e.id === selected)?.label})
          </span>
        </div>
      )}

      {/* Legend */}
      {(musicians.length > 0 || stageElements.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Legende :
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className="inline-block h-3 w-3 rounded-full bg-primary/90" />
            Musicien
          </span>
          {[...new Set(stageElements.map((e) => e.type))].map((type) => (
            <span
              key={type}
              className="flex items-center gap-1 text-[11px] text-muted-foreground"
            >
              <span
                className={`inline-block h-3 w-3 rounded-sm ${ELEMENT_COLORS[type]}`}
              />
              {ELEMENT_LABELS[type]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
