"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { PlayStepper, type PlayStep } from "./play-stepper";
import { createSetlistWithItems } from "@/lib/actions/setlists";
import { EXERCISE_CATEGORY_LABELS } from "@/types";
import type {
  Song,
  ExerciseWithProgress,
  ExerciseCategory,
  SongPracticeStats,
  UserPlan,
} from "@/types";

const STORAGE_KEY = "ostinara:jouer:file";

/** Un element de la file ad-hoc. On ne stocke que des references + l'express. */
type QueueItem =
  | { uid: string; kind: "song"; songId: string }
  | { uid: string; kind: "exercise"; exerciseId: string }
  | {
      uid: string;
      kind: "express";
      name: string;
      category?: ExerciseCategory;
      bpm?: number;
    };

interface PlayQueuePanelProps {
  songs: Song[];
  exercises: ExerciseWithProgress[];
  songPracticeStats: Record<string, SongPracticeStats>;
  currentBpm: number;
  onRequestBpm: (bpm: number) => void;
  songWorkingBpm: (song: Song) => number | null;
  userPlan: UserPlan;
}

function uid() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function PlayQueuePanel({
  songs,
  exercises,
  songPracticeStats,
  currentBpm,
  onRequestBpm,
  songWorkingBpm,
  userPlan,
}: PlayQueuePanelProps) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Recherche d'ajout
  const [songQuery, setSongQuery] = useState("");
  const [exerciseQuery, setExerciseQuery] = useState("");
  // Exo express
  const [expressName, setExpressName] = useState("");
  const [expressCategory, setExpressCategory] = useState<ExerciseCategory | "">("");
  const [expressBpm, setExpressBpm] = useState(0);

  // Enregistrement comme setlist
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // La file survit a la navigation : on la lit au montage, on l'ecrit ensuite.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setQueue(JSON.parse(raw));
    } catch {
      // storage indisponible : on part d'une file vide
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch {
      // tant pis, la file reste en memoire pour cette session
    }
  }, [queue, loaded]);

  // Resolution de chaque element : son libelle et, si possible, sa source.
  const entries = useMemo(
    () =>
      queue.map((item) => {
        if (item.kind === "song") {
          const song = songs.find((s) => s.id === item.songId) ?? null;
          return {
            item,
            song,
            exercise: null as ExerciseWithProgress | null,
            label: song?.title ?? "Morceau supprimé",
            sub: song?.artist ?? "Plus dans ta bibliothèque",
            valid: !!song,
          };
        }
        if (item.kind === "exercise") {
          const exercise =
            exercises.find((e) => e.id === item.exerciseId) ?? null;
          return {
            item,
            song: null as Song | null,
            exercise,
            label: exercise?.name ?? "Exercice supprimé",
            sub: exercise
              ? EXERCISE_CATEGORY_LABELS[exercise.category]
              : "Plus dans ta bibliothèque",
            valid: !!exercise,
          };
        }
        return {
          item,
          song: null as Song | null,
          exercise: null as ExerciseWithProgress | null,
          label: item.name,
          sub: item.category
            ? EXERCISE_CATEGORY_LABELS[item.category]
            : "Exercice express",
          valid: true,
        };
      }),
    [queue, songs, exercises]
  );

  const steps: PlayStep[] = useMemo(
    () =>
      entries
        .filter((e) => e.valid)
        .map((e): PlayStep => {
          if (e.item.kind === "song") {
            return {
              key: e.item.uid,
              kind: "song",
              song: e.song,
              songTitle: e.song?.title,
              songArtist: e.song?.artist,
              songCoverUrl: e.song?.cover_url,
              exercise: null,
              bpm: null,
            };
          }
          if (e.item.kind === "exercise") {
            return {
              key: e.item.uid,
              kind: "exercise",
              song: null,
              exercise: e.exercise,
              exerciseName: e.exercise?.name,
              exerciseCategory: e.exercise?.category,
              bpm: null,
            };
          }
          return {
            key: e.item.uid,
            kind: "exercise",
            song: null,
            exercise: null,
            exerciseName: e.item.name,
            exerciseCategory: e.item.category,
            bpm: e.item.bpm ?? null,
          };
        }),
    [entries]
  );

  // --- Mutations de la file ---
  const add = (item: QueueItem) => {
    setQueue((q) => [...q, item]);
    setSaveMessage(null);
  };
  const remove = (u: string) => setQueue((q) => q.filter((i) => i.uid !== u));
  const move = (u: string, dir: -1 | 1) =>
    setQueue((q) => {
      const i = q.findIndex((x) => x.uid === u);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= q.length) return q;
      const next = [...q];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const clearAll = () => {
    setQueue([]);
    setShowSave(false);
    setSaveMessage(null);
  };

  const addExpress = () => {
    if (!expressName.trim()) return;
    add({
      uid: uid(),
      kind: "express",
      name: expressName.trim(),
      category: expressCategory || undefined,
      bpm: expressBpm > 0 ? expressBpm : undefined,
    });
    setExpressName("");
    setExpressCategory("");
    setExpressBpm(0);
  };

  const filteredSongs = songQuery
    ? songs
        .filter(
          (s) =>
            s.title.toLowerCase().includes(songQuery.toLowerCase()) ||
            s.artist.toLowerCase().includes(songQuery.toLowerCase())
        )
        .slice(0, 6)
    : [];
  const filteredExercises = (
    exerciseQuery
      ? exercises.filter((e) =>
          e.name.toLowerCase().includes(exerciseQuery.toLowerCase())
        )
      : exercises
  ).slice(0, 6);

  const handleSave = async () => {
    const validEntries = entries.filter((e) => e.valid);
    if (validEntries.length === 0 || !saveName.trim()) return;
    setSaving(true);
    setSaveMessage(null);

    const items = validEntries.map((e) => {
      if (e.item.kind === "song" && e.song) {
        return {
          item_type: "song" as const,
          song_id: e.song.id,
          song_title: e.song.title,
          song_artist: e.song.artist,
          song_cover_url: e.song.cover_url,
          bpm: e.song.target_bpm ?? undefined,
        };
      }
      if (e.item.kind === "exercise" && e.exercise) {
        return {
          item_type: "exercise" as const,
          exercise_id: e.exercise.id,
          exercise_name: e.exercise.name,
          exercise_category: e.exercise.category,
          bpm: e.exercise.target_bpm ?? undefined,
          duration_seconds: e.exercise.duration_minutes
            ? e.exercise.duration_minutes * 60
            : undefined,
        };
      }
      // express
      const exp = e.item as Extract<QueueItem, { kind: "express" }>;
      return {
        item_type: "exercise" as const,
        exercise_name: exp.name,
        exercise_category: exp.category,
        bpm: exp.bpm,
      };
    });

    const result = await createSetlistWithItems(saveName.trim(), items);
    setSaving(false);

    if (result.success) {
      setShowSave(false);
      setSaveName("");
      setSaveMessage("Setlist enregistrée dans Commu › Groupes.");
    } else {
      setSaveMessage(result.error || "Erreur lors de l'enregistrement");
    }
  };

  const validCount = entries.filter((e) => e.valid).length;

  return (
    <div className="space-y-6">
      {/* ---- Constructeur ---- */}
      <div className="space-y-4 rounded-xl border border-border p-4">
        <h2 className="font-display text-2xl font-extrabold uppercase leading-none">
          Monte ta session
        </h2>

        {/* Ajouter un morceau */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Ajouter un morceau
          </label>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={2}
              aria-hidden="true"
            />
            <input
              type="text"
              value={songQuery}
              onChange={(e) => setSongQuery(e.target.value)}
              placeholder="Rechercher dans ta bibliothèque..."
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm focus:border-primary"
            />
          </div>
          {filteredSongs.length > 0 && (
            <div className="mt-2 space-y-1">
              {filteredSongs.map((song) => (
                <button
                  key={song.id}
                  onClick={() => add({ uid: uid(), kind: "song", songId: song.id })}
                  className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm transition-colors hover:bg-accent"
                >
                  <Plus className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden="true" />
                  <span className="truncate font-medium">{song.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {song.artist}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ajouter un exercice (biblio) */}
        <div className="border-t border-border pt-4">
          <label className="mb-1.5 block text-sm font-medium">
            Ajouter un exercice
          </label>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={2}
              aria-hidden="true"
            />
            <input
              type="text"
              value={exerciseQuery}
              onChange={(e) => setExerciseQuery(e.target.value)}
              placeholder="Rechercher un exercice..."
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm focus:border-primary"
            />
          </div>
          <div className="mt-2 space-y-1">
            {filteredExercises.map((exercise) => (
              <button
                key={exercise.id}
                onClick={() =>
                  add({ uid: uid(), kind: "exercise", exerciseId: exercise.id })
                }
                className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm transition-colors hover:bg-accent"
              >
                <Plus className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden="true" />
                <span className="truncate font-medium">{exercise.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {EXERCISE_CATEGORY_LABELS[exercise.category]}
                </span>
              </button>
            ))}
          </div>

          {/* Exo express */}
          <div className="mt-3 rounded-lg border border-dashed border-border p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Ou un exercice express
            </p>
            <input
              type="text"
              value={expressName}
              onChange={(e) => setExpressName(e.target.value)}
              placeholder="Ex: Échauffement 5 min..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
            />
            <div className="mt-2 flex gap-2">
              <select
                value={expressCategory}
                onChange={(e) =>
                  setExpressCategory(e.target.value as ExerciseCategory | "")
                }
                className="flex-1 rounded-lg border border-input bg-background px-2 py-2 text-sm focus:border-primary"
              >
                <option value="">Catégorie</option>
                {(Object.keys(EXERCISE_CATEGORY_LABELS) as ExerciseCategory[]).map(
                  (cat) => (
                    <option key={cat} value={cat}>
                      {EXERCISE_CATEGORY_LABELS[cat]}
                    </option>
                  )
                )}
              </select>
              <input
                type="number"
                value={expressBpm || ""}
                onChange={(e) => setExpressBpm(parseInt(e.target.value) || 0)}
                placeholder="BPM"
                min="20"
                max="300"
                className="w-20 rounded-lg border border-input bg-background px-2 py-2 text-sm focus:border-primary"
              />
              <button
                onClick={addExpress}
                disabled={!expressName.trim()}
                className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---- La file ---- */}
      {queue.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-[13px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
              Ta session · {queue.length}
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSave((v) => !v)}
                disabled={validCount === 0}
                className="text-xs font-semibold text-foreground hover:underline disabled:opacity-40"
              >
                Enregistrer comme setlist
              </button>
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                Vider
              </button>
            </div>
          </div>

          {showSave && (
            <div className="flex gap-2 rounded-lg border border-border bg-accent/40 p-2">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Nom de la setlist"
                className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:border-primary"
              />
              <button
                onClick={handleSave}
                disabled={saving || !saveName.trim()}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "..." : "Enregistrer"}
              </button>
            </div>
          )}
          {saveMessage && (
            <p className="text-xs text-muted-foreground">{saveMessage}</p>
          )}

          <ol className="divide-y divide-border rounded-xl border border-border">
            {entries.map((entry, i) => (
              <li
                key={entry.item.uid}
                className={`flex items-center gap-2 p-2.5 ${
                  entry.valid ? "" : "opacity-50"
                }`}
              >
                <span className="tabular w-5 shrink-0 text-center font-display text-base font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                    entry.item.kind === "song"
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/15 text-primary"
                  }`}
                >
                  {entry.item.kind === "song" ? "Morceau" : "Exo"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{entry.label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {entry.sub}
                  </p>
                </div>
                <div className="flex shrink-0 items-center">
                  <button
                    onClick={() => move(entry.item.uid, -1)}
                    disabled={i === 0}
                    aria-label="Monter"
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => move(entry.item.uid, 1)}
                    disabled={i === entries.length - 1}
                    aria-label="Descendre"
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => remove(entry.item.uid)}
                    aria-label="Retirer"
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ---- Le dérouleur ---- */}
      {steps.length > 0 ? (
        <div className="border-t border-border pt-5">
          <PlayStepper
            steps={steps}
            title="Ma session"
            songPracticeStats={songPracticeStats}
            currentBpm={currentBpm}
            onRequestBpm={onRequestBpm}
            songWorkingBpm={songWorkingBpm}
            userPlan={userPlan}
          />
        </div>
      ) : (
        queue.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Ajoute des morceaux et des exercices ci-dessus pour composer ta
            session, puis déroule-la avec le métronome.
          </p>
        )
      )}
    </div>
  );
}
