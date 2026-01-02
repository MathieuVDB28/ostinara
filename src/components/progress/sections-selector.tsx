"use client";

import type { SongSection } from "@/types";

interface SectionOption {
  value: SongSection;
  label: string;
}

const sections: SectionOption[] = [
  { value: "intro", label: "Intro" },
  { value: "verse", label: "Couplet" },
  { value: "chorus", label: "Refrain" },
  { value: "bridge", label: "Pont" },
  { value: "solo", label: "Solo" },
  { value: "outro", label: "Outro" },
  { value: "full_song", label: "Complet" },
];

interface SectionsSelectorProps {
  value: SongSection[];
  onChange: (sections: SongSection[]) => void;
}

export function SectionsSelector({ value, onChange }: SectionsSelectorProps) {
  const handleToggle = (section: SongSection) => {
    if (section === "full_song") {
      // Si on clique sur "Complet", on désélectionne tout le reste
      if (value.includes("full_song")) {
        onChange([]);
      } else {
        onChange(["full_song"]);
      }
    } else {
      // Si on clique sur une autre section, on retire "full_song" si présent
      const newValue = value.filter(s => s !== "full_song");

      if (newValue.includes(section)) {
        onChange(newValue.filter(s => s !== section));
      } else {
        onChange([...newValue, section]);
      }
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {sections.map((section) => {
        const isSelected = value.includes(section.value);
        const isFullSong = section.value === "full_song";

        return (
          <button
            key={section.value}
            type="button"
            onClick={() => handleToggle(section.value)}
            className={`
              px-3 py-1.5 rounded-full text-sm font-medium
              transition-all duration-200
              ${isSelected
                ? isFullSong
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/20 text-primary border border-primary"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }
            `}
          >
            {section.label}
          </button>
        );
      })}
    </div>
  );
}

export function getSectionLabel(section: SongSection): string {
  return sections.find(s => s.value === section)?.label || section;
}

export function getSectionsLabels(sectionValues: SongSection[]): string {
  if (sectionValues.length === 0) return "";
  if (sectionValues.includes("full_song")) return "Morceau complet";
  return sectionValues.map(s => getSectionLabel(s)).join(", ");
}
