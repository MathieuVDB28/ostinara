"use client";

import { useState, useRef, useEffect } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { FilterState, SongDifficulty } from "@/types";

interface FilterPopoverProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  activeCount: number;
  availableTunings: string[];
}

const difficultyOptions: { value: SongDifficulty; label: string }[] = [
  { value: "beginner", label: "Débutant" },
  { value: "intermediate", label: "Intermédiaire" },
  { value: "advanced", label: "Avancé" },
  { value: "expert", label: "Expert" },
];

export function FilterPopover({
  filters,
  onFiltersChange,
  activeCount,
  availableTunings,
}: FilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Fermer au clic extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fermer avec Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const toggleDifficulty = (difficulty: SongDifficulty) => {
    const current = filters.difficulties;
    const updated = current.includes(difficulty)
      ? current.filter((d) => d !== difficulty)
      : [...current, difficulty];
    onFiltersChange({ ...filters, difficulties: updated });
  };

  const toggleTuning = (tuning: string) => {
    const current = filters.tunings;
    const updated = current.includes(tuning)
      ? current.filter((t) => t !== tuning)
      : [...current, tuning];
    onFiltersChange({ ...filters, tunings: updated });
  };

  const setCapoFilter = (value: boolean | null) => {
    onFiltersChange({ ...filters, hasCapo: value });
  };

  const resetFilters = () => {
    onFiltersChange({ difficulties: [], tunings: [], hasCapo: null });
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          activeCount > 0
            ? "border-foreground bg-foreground text-background"
            : "border-border text-muted-foreground hover:text-foreground"
        }`}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        <span>Filtres</span>
        {activeCount > 0 && (
          <span className="tabular flex h-4 min-w-4 items-center justify-center rounded-full bg-background px-1 text-[10px] text-foreground">
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-2 w-72 rounded-xl border border-border bg-card p-4 shadow-md">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Filtres avancés</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded p-1 hover:bg-accent"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Difficulté */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Difficulté
            </label>
            <div className="flex flex-wrap gap-2">
              {difficultyOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleDifficulty(option.value)}
                  className={`rounded-full px-3 py-1 text-sm transition-colors ${
                    filters.difficulties.includes(option.value)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Accordage */}
          {availableTunings.length > 0 && (
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Accordage
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTunings.map((tuning) => (
                  <button
                    key={tuning}
                    onClick={() => toggleTuning(tuning)}
                    className={`rounded-full px-3 py-1 text-sm transition-colors ${
                      filters.tunings.includes(tuning)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {tuning}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Capo */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Capo
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setCapoFilter(null)}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  filters.hasCapo === null
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setCapoFilter(true)}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  filters.hasCapo === true
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                Avec capo
              </button>
              <button
                onClick={() => setCapoFilter(false)}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  filters.hasCapo === false
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                Sans capo
              </button>
            </div>
          </div>

          {/* Reset */}
          {activeCount > 0 && (
            <button
              onClick={resetFilters}
              className="w-full rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}
    </div>
  );
}
