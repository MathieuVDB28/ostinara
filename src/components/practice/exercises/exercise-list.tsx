"use client";

import { useState, useMemo } from "react";
import { ExerciseCard } from "./exercise-card";
import { EXERCISE_CATEGORY_LABELS } from "@/types";
import type { ExerciseWithProgress, ExerciseCategory, ExerciseDifficulty } from "@/types";

interface ExerciseListProps {
  exercises: ExerciseWithProgress[];
  onSelectExercise: (exercise: ExerciseWithProgress) => void;
}

const DIFFICULTY_LABELS: Record<ExerciseDifficulty, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
  expert: "Expert",
};

export function ExerciseList({ exercises, onSelectExercise }: ExerciseListProps) {
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | "all">("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<ExerciseDifficulty | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(() => {
    const cats = new Set<ExerciseCategory>();
    exercises.forEach((e) => cats.add(e.category));
    return Array.from(cats);
  }, [exercises]);

  const filteredExercises = useMemo(() => {
    return exercises.filter((exercise) => {
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
          exercise.description?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [exercises, selectedCategory, selectedDifficulty, searchQuery]);

  // Grouper par catégorie si "all" est sélectionné
  const groupedExercises = useMemo(() => {
    if (selectedCategory !== "all") {
      return { [selectedCategory]: filteredExercises };
    }

    const grouped: Record<string, ExerciseWithProgress[]> = {};
    filteredExercises.forEach((exercise) => {
      if (!grouped[exercise.category]) {
        grouped[exercise.category] = [];
      }
      grouped[exercise.category].push(exercise);
    });
    return grouped;
  }, [filteredExercises, selectedCategory]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Rechercher un exercice..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm transition-colors focus:border-primary focus:outline-none"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-accent hover:bg-accent/80"
            }`}
          >
            Tous
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent hover:bg-accent/80"
              }`}
            >
              {EXERCISE_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty filter */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setSelectedDifficulty("all")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            selectedDifficulty === "all"
              ? "bg-primary/20 text-primary"
              : "bg-muted hover:bg-accent"
          }`}
        >
          Toutes difficultés
        </button>
        {(["beginner", "intermediate", "advanced", "expert"] as ExerciseDifficulty[]).map(
          (diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedDifficulty === diff
                  ? "bg-primary/20 text-primary"
                  : "bg-muted hover:bg-accent"
              }`}
            >
              {DIFFICULTY_LABELS[diff]}
            </button>
          )
        )}
      </div>

      {/* Exercise list */}
      <div className="space-y-6">
        {Object.entries(groupedExercises).map(([category, categoryExercises]) => (
          <div key={category}>
            {selectedCategory === "all" && (
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                {EXERCISE_CATEGORY_LABELS[category as ExerciseCategory]}
              </h3>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {categoryExercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  onClick={() => onSelectExercise(exercise)}
                />
              ))}
            </div>
          </div>
        ))}

        {filteredExercises.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            <p>Aucun exercice trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
}
