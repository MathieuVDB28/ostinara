"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowDownUp, ChevronDown } from "lucide-react";
import type { SortOption } from "@/types";

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "date_desc", label: "Plus récent" },
  { value: "date_asc", label: "Plus ancien" },
  { value: "title_asc", label: "Titre A-Z" },
  { value: "title_desc", label: "Titre Z-A" },
  { value: "progress_desc", label: "Progression" },
  { value: "difficulty_asc", label: "Difficulté croissante" },
  { value: "difficulty_desc", label: "Difficulté décroissante" },
];

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer au clic extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  const currentLabel = sortOptions.find((opt) => opt.value === value)?.label || "Trier";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={`Trier : ${currentLabel}`}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowDownUp className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        <span className="hidden sm:inline">{currentLabel}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
          strokeWidth={2}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-2 w-48 rounded-xl border border-border bg-card py-1 shadow-md">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                value === option.value ? "text-primary" : "text-foreground"
              }`}
            >
              {value === option.value && (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {value !== option.value && <span className="w-4" />}
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
