"use client";

import { useState, useMemo } from "react";
import { ChevronDown, Plus, Search } from "lucide-react";
import { ExerciseCard } from "./exercise-card";
import { EXERCISE_CATEGORY_LABELS } from "@/types";
import { useMyInstruments } from "@/components/providers/instruments-provider";
import { InstrumentSwitch } from "@/components/instruments/instrument-switch";
import { EXERCISE_CATEGORIES, exerciseFitsInstrument } from "@/lib/instruments";
import type { ExerciseWithProgress, ExerciseCategory, ExerciseDifficulty, Instrument } from "@/types";

interface ExerciseListProps {
  exercises: ExerciseWithProgress[];
  onSelectExercise: (exercise: ExerciseWithProgress) => void;
  onCreateExercise: () => void;
}

const DIFFICULTY_LABELS: Record<ExerciseDifficulty, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
  expert: "Expert",
};

type SourceFilter = "all" | "system" | "mine" | "friends";

export function ExerciseList({ exercises, onSelectExercise, onCreateExercise }: ExerciseListProps) {
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | "all">("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<ExerciseDifficulty | "all">("all");
  const [selectedSource, setSelectedSource] = useState<SourceFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  // Plusieurs instruments : on travaille sur un a la fois, le principal
  // d'abord. Le serveur a deja ecarte ce qui ne parle a aucun des miens.
  const myInstruments = useMyInstruments();
  const [instrument, setInstrument] = useState<Instrument | null>(
    myInstruments.isMulti ? myInstruments.primary : null
  );

  const forInstrument = useMemo(
    () => (instrument ? exercises.filter((e) => exerciseFitsInstrument(e, instrument)) : exercises),
    [exercises, instrument]
  );

  // Les categories presentes, dans l'ordre propre a l'instrument.
  const categories = useMemo(() => {
    const present = new Set(forInstrument.map((e) => e.category));
    const order = EXERCISE_CATEGORIES[instrument ?? myInstruments.primary];
    return [...order.filter((cat) => present.has(cat)), ...[...present].filter((cat) => !order.includes(cat))];
  }, [forInstrument, instrument, myInstruments.primary]);

  const hasCustomExercises = useMemo(
    () => exercises.some((e) => !e.is_system && !e.is_from_friend),
    [exercises]
  );

  const hasFriendExercises = useMemo(
    () => exercises.some((e) => e.is_from_friend),
    [exercises]
  );

  const filteredExercises = useMemo(() => {
    return forInstrument.filter((exercise) => {
      // Filtre par source
      if (selectedSource === "system" && !exercise.is_system) return false;
      if (selectedSource === "mine" && (exercise.is_system || exercise.is_from_friend)) return false;
      if (selectedSource === "friends" && !exercise.is_from_friend) return false;

      // Filtre par catégorie
      if (selectedCategory !== "all" && exercise.category !== selectedCategory) {
        return false;
      }
      // Filtre par difficulté
      if (selectedDifficulty !== "all" && exercise.difficulty !== selectedDifficulty) {
        return false;
      }
      // Filtre par recherche
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          exercise.name.toLowerCase().includes(query) ||
          exercise.description?.toLowerCase().includes(query) ||
          exercise.creator_name?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [forInstrument, selectedSource, selectedCategory, selectedDifficulty, searchQuery]);

  // Grouper par catégorie si "all" est sélectionné
  const groupedExercises = useMemo(() => {
    if (selectedCategory !== "all") {
      return { [selectedCategory]: filteredExercises };
    }

    const grouped: Record<string, ExerciseWithProgress[]> = {};
    // Les groupes suivent l'ordre des categories de l'instrument.
    categories.forEach((cat) => {
      if (filteredExercises.some((e) => e.category === cat)) grouped[cat] = [];
    });
    filteredExercises.forEach((exercise) => {
      if (!grouped[exercise.category]) {
        grouped[exercise.category] = [];
      }
      grouped[exercise.category].push(exercise);
    });
    return grouped;
  }, [filteredExercises, selectedCategory, categories]);

  const chip = (active: boolean) =>
    `inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-3 text-xs font-semibold transition-colors ${
      active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
    }`;

  const sources: { value: SourceFilter; label: string; show: boolean }[] = [
    { value: "all", label: "Tous", show: true },
    { value: "system", label: "Officiels", show: true },
    { value: "mine", label: "Mes exercices", show: hasCustomExercises },
    { value: "friends", label: "De mes amis", show: hasFriendExercises },
  ];

  /*
   * Style Atelier (docs/refonte-ui.md) : quatre rangees de filtres en
   * pastilles ambrees devenaient une seule rangee de puces neutres, la
   * difficulte passe dans un menu. Les exercices sont des lignes a filet,
   * groupees par technique.
   */
  return (
    <div className="flex flex-col gap-3">
      {myInstruments.isMulti && (
        <InstrumentSwitch
          options={myInstruments.instruments}
          value={instrument}
          onChange={(next) => {
            setInstrument(next);
            setSelectedCategory("all");
          }}
          label="Exercices pour"
        />
      )}
      <div className="flex items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Rechercher un exercice</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
          <input
            type="search"
            placeholder="Rechercher un exercice…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-h-[38px] w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </label>
        <button
          onClick={onCreateExercise}
          className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 text-[13px] font-semibold transition-colors hover:bg-accent"
        >
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Créer
        </button>
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
        {sources
          .filter((source) => source.show)
          .map((source) => (
            <button
              key={source.value}
              onClick={() => setSelectedSource(source.value)}
              aria-pressed={selectedSource === source.value}
              className={chip(selectedSource === source.value)}
            >
              {source.label}
            </button>
          ))}
        <span aria-hidden="true" className="mx-0.5 h-5 w-px shrink-0 self-center bg-border" />
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(selectedCategory === cat ? "all" : cat)}
            aria-pressed={selectedCategory === cat}
            className={chip(selectedCategory === cat)}
          >
            {EXERCISE_CATEGORY_LABELS[cat]}
          </button>
        ))}
        <span aria-hidden="true" className="mx-0.5 h-5 w-px shrink-0 self-center bg-border" />
        <label className={`${chip(selectedDifficulty !== "all")} relative pr-7`}>
          <span className="sr-only">Difficulté</span>
          {selectedDifficulty === "all" ? "Difficulté" : DIFFICULTY_LABELS[selectedDifficulty]}
          <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value as ExerciseDifficulty | "all")}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            <option value="all">Toutes difficultés</option>
            {(["beginner", "intermediate", "advanced", "expert"] as ExerciseDifficulty[]).map((diff) => (
              <option key={diff} value={diff}>
                {DIFFICULTY_LABELS[diff]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-5">
        {Object.entries(groupedExercises).map(([category, categoryExercises]) => (
          <section key={category} aria-label={EXERCISE_CATEGORY_LABELS[category as ExerciseCategory]}>
            <h3 className="flex justify-between border-b border-border pb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <span>{EXERCISE_CATEGORY_LABELS[category as ExerciseCategory]}</span>
              <span aria-hidden="true">bpm</span>
            </h3>
            <div>
              {categoryExercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  onClick={() => onSelectExercise(exercise)}
                />
              ))}
            </div>
          </section>
        ))}

        {filteredExercises.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            <p>Aucun exercice trouvé</p>
            {selectedSource === "friends" && (
              <p className="mt-1 text-xs">
                Tes amis n&apos;ont pas encore partagé d&apos;exercices
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
