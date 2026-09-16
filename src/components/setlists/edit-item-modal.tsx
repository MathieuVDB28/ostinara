"use client";

import { useState, useEffect } from "react";
import { updateSetlistItem } from "@/lib/actions/setlists";
import { TabsSearchPanel } from "@/components/library/tabs-search-panel";
import type {
  SetlistItemWithSongOwner,
  PlayedSection,
  UserPlan,
  SongsterrTabStructure,
} from "@/types";
import { PLAYED_SECTION_PRESETS } from "@/types";

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: SetlistItemWithSongOwner | null;
  userPlan: UserPlan;
}

export function EditItemModal({
  isOpen,
  onClose,
  onSuccess,
  item,
  userPlan,
}: EditItemModalProps) {
  const [notes, setNotes] = useState("");
  const [transitionSeconds, setTransitionSeconds] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [sectionName, setSectionName] = useState("");
  const [tabsUrl, setTabsUrl] = useState("");
  const [bpm, setBpm] = useState(0);
  const [playedSections, setPlayedSections] = useState<PlayedSection[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "tabs">("general");

  // New section form
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionStart, setNewSectionStart] = useState(1);
  const [newSectionEnd, setNewSectionEnd] = useState(4);

  // Detected sections from Songsterr analysis
  const [detectedSections, setDetectedSections] = useState<PlayedSection[]>([]);

  // Initialize form when item changes
  useEffect(() => {
    if (item) {
      setNotes(item.notes || "");
      setTransitionSeconds(item.transition_seconds || 0);
      setDurationMinutes(
        item.duration_seconds ? Math.round(item.duration_seconds / 60) : 0
      );
      setSectionName(item.section_name || "");
      setTabsUrl(item.tabs_url || "");
      setBpm(item.bpm || 0);
      setPlayedSections(item.played_sections || []);
      setError(null);
      setActiveTab("general");
      setNewSectionName("");
      setNewSectionStart(1);
      setNewSectionEnd(4);
      setDetectedSections([]);
    }
  }, [item]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const result = await updateSetlistItem(item.id, {
      notes: notes.trim() || undefined,
      transition_seconds: transitionSeconds,
      duration_seconds:
        durationMinutes > 0 ? durationMinutes * 60 : undefined,
      section_name:
        item.item_type === "section" ? sectionName.trim() : undefined,
      tabs_url: tabsUrl.trim() || undefined,
      bpm: bpm > 0 ? bpm : undefined,
      played_sections: playedSections.length > 0 ? playedSections : undefined,
    });

    setSaving(false);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || "Erreur lors de la sauvegarde");
    }
  };

  const handleAddSection = () => {
    if (!newSectionName.trim() || newSectionStart >= newSectionEnd) return;

    setPlayedSections([
      ...playedSections,
      {
        name: newSectionName.trim(),
        startMeasure: newSectionStart,
        endMeasure: newSectionEnd,
      },
    ]);
    setNewSectionName("");
    setNewSectionStart(newSectionEnd + 1);
    setNewSectionEnd(newSectionEnd + 8);
  };

  const handleRemoveSection = (index: number) => {
    setPlayedSections(playedSections.filter((_, i) => i !== index));
  };

  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const newSections = [...playedSections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;
    [newSections[index], newSections[targetIndex]] = [
      newSections[targetIndex],
      newSections[index],
    ];
    setPlayedSections(newSections);
  };

  const handleTabStructure = (structure: SongsterrTabStructure) => {
    // Auto-fill BPM
    if (structure.bpm > 0) {
      setBpm(structure.bpm);
    }
    // Store detected sections for the picker UI
    if (structure.sections.length > 0) {
      setDetectedSections(structure.sections);
    }
  };

  // Add a detected section to played sections
  const handleAddDetectedSection = (section: PlayedSection) => {
    // Check if already added
    const alreadyAdded = playedSections.some(
      (s) => s.name === section.name && s.startMeasure === section.startMeasure
    );
    if (!alreadyAdded) {
      setPlayedSections([...playedSections, section]);
    }
  };

  // Add all detected sections at once
  const handleAddAllDetected = () => {
    setPlayedSections(detectedSections);
  };

  // Check if a detected section is already in played sections
  const isSectionAdded = (section: PlayedSection) => {
    return playedSections.some(
      (s) => s.name === section.name && s.startMeasure === section.startMeasure
    );
  };

  const isSong = item.item_type === "song";

  // Calculate total sections duration if BPM is set
  const totalSectionsMeasures = playedSections.reduce(
    (acc, s) => acc + (s.endMeasure - s.startMeasure + 1),
    0
  );
  const sectionsDurationSeconds =
    bpm > 0 ? (totalSectionsMeasures * 4 * 60) / bpm : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {isSong ? "Modifier le morceau" : "Modifier la section"}
            </h2>
            {isSong && (
              <p className="mt-1 text-sm text-muted-foreground">
                {item.song_title} - {item.song_artist}
              </p>
            )}
          </div>
          <button aria-label="Fermer"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs for songs */}
        {isSong && (
          <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1">
            <button
              onClick={() => setActiveTab("general")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "general"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab("tabs")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "tabs"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tabs & Sections
            </button>
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          {activeTab === "general" ? (
            <>
              {/* Section name (only for sections) */}
              {!isSong && (
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Nom de la section
                  </label>
                  <input
                    type="text"
                    value={sectionName}
                    onChange={(e) => setSectionName(e.target.value)}
                    placeholder="Ex: Pause, Rappel..."
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="mb-1 block text-sm font-medium">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes pour ce morceau..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
                />
              </div>

              {/* Duration, Transition, BPM */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Duree (min)
                  </label>
                  <input
                    type="number"
                    value={durationMinutes || ""}
                    onChange={(e) =>
                      setDurationMinutes(parseInt(e.target.value) || 0)
                    }
                    placeholder="0"
                    min="0"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Transition (s)
                  </label>
                  <input
                    type="number"
                    value={transitionSeconds || ""}
                    onChange={(e) =>
                      setTransitionSeconds(parseInt(e.target.value) || 0)
                    }
                    placeholder="0"
                    min="0"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
                  />
                </div>
                {isSong && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      BPM
                    </label>
                    <input
                      type="number"
                      value={bpm || ""}
                      onChange={(e) => setBpm(parseInt(e.target.value) || 0)}
                      placeholder="120"
                      min="20"
                      max="300"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Tabs search */}
              <TabsSearchPanel
                title={item.song_title || ""}
                artist={item.song_artist || ""}
                currentTabsUrl={tabsUrl}
                onSelectTab={(url) => setTabsUrl(url)}
                onTabStructure={handleTabStructure}
                userPlan={userPlan}
              />

              {/* Separator */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-3 text-sm text-muted-foreground">
                    Sections jouees
                  </span>
                </div>
              </div>

              {/* BPM reminder */}
              {bpm <= 0 && (
                <p className="text-xs text-primary">
                  Definis un BPM dans l&apos;onglet General pour calculer la duree des sections en jam.
                </p>
              )}

              {/* Existing sections */}
              {playedSections.length > 0 && (
                <div className="space-y-2">
                  {playedSections.map((section, index) => {
                    const measures =
                      section.endMeasure - section.startMeasure + 1;
                    const duration =
                      bpm > 0
                        ? Math.round((measures * 4 * 60) / bpm)
                        : null;
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-lg border border-border bg-accent/50 p-2"
                      >
                        {/* Reorder buttons */}
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleMoveSection(index, "up")}
                            disabled={index === 0}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 15l7-7 7 7"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleMoveSection(index, "down")}
                            disabled={
                              index === playedSections.length - 1
                            }
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {section.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Mesures {section.startMeasure}-{section.endMeasure}{" "}
                            ({measures} mes.)
                            {duration !== null && ` ~ ${duration}s`}
                          </p>
                        </div>

                        <button
                          onClick={() => handleRemoveSection(index)}
                          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    );
                  })}

                  {/* Total duration */}
                  {bpm > 0 && playedSections.length > 0 && (
                    <p className="text-xs text-muted-foreground text-right">
                      Duree totale :{" "}
                      {Math.floor(sectionsDurationSeconds / 60)}:
                      {Math.round(sectionsDurationSeconds % 60)
                        .toString()
                        .padStart(2, "0")}{" "}
                      a {bpm} BPM
                    </p>
                  )}
                </div>
              )}

              {/* Detected sections from tab analysis */}
              {detectedSections.length > 0 && (
                <div className="rounded-lg border border-chart-2/30 bg-chart-2/5 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-chart-2">
                      {detectedSections.length} sections detectees
                    </p>
                    <button
                      onClick={handleAddAllDetected}
                      className="rounded-lg bg-chart-2/20 px-2.5 py-1 text-xs font-medium text-chart-2 transition-colors hover:bg-chart-2/30"
                    >
                      Tout ajouter
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detectedSections.map((section, index) => {
                      const added = isSectionAdded(section);
                      const measures = section.endMeasure - section.startMeasure + 1;
                      return (
                        <button
                          key={index}
                          onClick={() => handleAddDetectedSection(section)}
                          disabled={added}
                          className={`rounded-lg px-2.5 py-1.5 text-left transition-all ${
                            added
                              ? "bg-primary/20 text-primary opacity-60 cursor-default"
                              : "bg-accent hover:bg-accent/80 text-foreground"
                          }`}
                        >
                          <span className="block text-xs font-medium">{section.name}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            Mes. {section.startMeasure}-{section.endMeasure} ({measures})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Clique sur les sections que tu joues. Les mesures sont remplies automatiquement.
                  </p>
                </div>
              )}

              {/* Manual section add */}
              <div className="rounded-lg border border-dashed border-border p-3 space-y-3">
                <p className="text-sm font-medium">Ajouter manuellement</p>

                {/* Preset name buttons (only if no detected sections) */}
                {detectedSections.length === 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {PLAYED_SECTION_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setNewSectionName(preset)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          newSectionName === preset
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      placeholder="Nom de la section"
                      className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm focus:border-primary"
                    />
                  </div>
                  <div className="w-20">
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Debut
                    </label>
                    <input
                      type="number"
                      value={newSectionStart}
                      onChange={(e) =>
                        setNewSectionStart(parseInt(e.target.value) || 1)
                      }
                      min="1"
                      className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm focus:border-primary"
                    />
                  </div>
                  <div className="w-20">
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Fin
                    </label>
                    <input
                      type="number"
                      value={newSectionEnd}
                      onChange={(e) =>
                        setNewSectionEnd(parseInt(e.target.value) || 1)
                      }
                      min="1"
                      className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm focus:border-primary"
                    />
                  </div>
                  <button
                    onClick={handleAddSection}
                    disabled={
                      !newSectionName.trim() || newSectionStart >= newSectionEnd
                    }
                    className="shrink-0 rounded-lg bg-primary p-1.5 text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
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
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
