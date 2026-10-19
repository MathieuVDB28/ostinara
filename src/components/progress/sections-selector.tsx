"use client";

import { useTranslations } from "next-intl";
import type { EnumsT } from "@/i18n/types";
import type { SongSection } from "@/types";

const SECTIONS: SongSection[] = ["intro", "verse", "chorus", "bridge", "solo", "outro", "full_song"];

interface SectionsSelectorProps {
  value: SongSection[];
  onChange: (sections: SongSection[]) => void;
}

export function SectionsSelector({ value, onChange }: SectionsSelectorProps) {
  const t = useTranslations("enums");
  const sections = SECTIONS.map((section) => ({ value: section, label: t(`section.${section}`) }));
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

export function getSectionLabel(section: SongSection, t: EnumsT): string {
  return SECTIONS.includes(section) ? t(`section.${section}`) : section;
}

export function getSectionsLabels(sectionValues: SongSection[], t: EnumsT): string {
  if (sectionValues.length === 0) return "";
  if (sectionValues.includes("full_song")) return t("fullSong");
  return sectionValues.map(s => getSectionLabel(s, t)).join(", ");
}
