"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { SetlistItemWithSongOwner, PlayedSection } from "@/types";

interface JamTabsViewerProps {
  currentItem: SetlistItemWithSongOwner | null;
  bpm: number;
  timeSignatureBeats: number;
  isPlaying: boolean;
  isHost: boolean;
}

export function JamTabsViewer({
  currentItem,
  bpm,
  timeSignatureBeats,
  isPlaying,
}: JamTabsViewerProps) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [sectionProgress, setSectionProgress] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [tabWindowOpen, setTabWindowOpen] = useState(false);
  const animationRef = useRef<number | null>(null);
  const sectionStartTimeRef = useRef<number | null>(null);
  const tabWindowRef = useRef<Window | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  const sections = currentItem?.played_sections || [];
  const songBpm = currentItem?.bpm || bpm;
  const tabsUrl = currentItem?.tabs_url;

  const getSectionDuration = useCallback(
    (section: PlayedSection) => {
      if (songBpm <= 0) return 0;
      const measures = section.endMeasure - section.startMeasure + 1;
      return (measures * timeSignatureBeats * 60) / songBpm;
    },
    [songBpm, timeSignatureBeats]
  );

  const totalDuration = sections.reduce(
    (acc, s) => acc + getSectionDuration(s),
    0
  );

  // Reset when song changes
  useEffect(() => {
    setCurrentSectionIndex(0);
    setSectionProgress(0);
    sectionStartTimeRef.current = null;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, [currentItem?.id]);

  // Auto-scroll active section into view
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [currentSectionIndex]);

  // Check if tab window is still open
  useEffect(() => {
    if (!tabWindowOpen) return;
    const interval = setInterval(() => {
      if (tabWindowRef.current?.closed) {
        setTabWindowOpen(false);
        tabWindowRef.current = null;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [tabWindowOpen]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !isAutoScrolling || sections.length === 0 || songBpm <= 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (!sectionStartTimeRef.current) {
        sectionStartTimeRef.current = timestamp;
      }

      const currentSection = sections[currentSectionIndex];
      if (!currentSection) return;

      const sectionDuration = getSectionDuration(currentSection) * 1000;
      const elapsed = timestamp - sectionStartTimeRef.current;
      const progress = Math.min(elapsed / sectionDuration, 1);

      setSectionProgress(progress);

      if (progress >= 1) {
        if (currentSectionIndex < sections.length - 1) {
          setCurrentSectionIndex((prev) => prev + 1);
          sectionStartTimeRef.current = timestamp;
          setSectionProgress(0);
        } else {
          setSectionProgress(1);
          return;
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, isAutoScrolling, sections, currentSectionIndex, songBpm, getSectionDuration]);

  useEffect(() => {
    if (!isPlaying) {
      sectionStartTimeRef.current = null;
    }
  }, [isPlaying]);

  const handleSectionClick = (index: number) => {
    setCurrentSectionIndex(index);
    setSectionProgress(0);
    sectionStartTimeRef.current = null;
  };

  const openTabWindow = () => {
    if (!tabsUrl) return;

    // If already open, focus it
    if (tabWindowRef.current && !tabWindowRef.current.closed) {
      tabWindowRef.current.focus();
      return;
    }

    // Open in a side popup (right half of screen)
    const width = Math.min(800, Math.floor(window.screen.width * 0.45));
    const height = window.screen.height;
    const left = window.screen.width - width;

    const win = window.open(
      tabsUrl,
      "songsterr_tabs",
      `width=${width},height=${height},left=${left},top=0,menubar=no,toolbar=no,status=no`
    );

    if (win) {
      tabWindowRef.current = win;
      setTabWindowOpen(true);
    }
  };

  if (!currentItem || currentItem.item_type !== "song") return null;
  if (!tabsUrl && sections.length === 0) return null;

  const globalProgress =
    totalDuration > 0
      ? ((sections.slice(0, currentSectionIndex).reduce((acc, s) => acc + getSectionDuration(s), 0) +
          getSectionDuration(sections[currentSectionIndex] || sections[0]) * sectionProgress) /
          totalDuration) *
        100
      : 0;

  const currentSection = sections[currentSectionIndex];
  const currentDuration = currentSection ? getSectionDuration(currentSection) : 0;
  const elapsedInSection = currentDuration * sectionProgress;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Main section display */}
      {sections.length > 0 && currentSection && (
        <div className="p-4 pb-3">
          {/* Current section - big display */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* Section number badge */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
                {currentSectionIndex + 1}
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary leading-tight">
                  {currentSection.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Mesures {currentSection.startMeasure}-{currentSection.endMeasure}
                  {" "}&middot;{" "}
                  {songBpm} BPM
                  {" "}&middot;{" "}
                  {Math.floor(elapsedInSection / 60)}:{Math.floor(elapsedInSection % 60).toString().padStart(2, "0")}
                  {" / "}
                  {Math.floor(currentDuration / 60)}:{Math.round(currentDuration % 60).toString().padStart(2, "0")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Auto/Manuel toggle */}
              <button
                onClick={() => setIsAutoScrolling(!isAutoScrolling)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  isAutoScrolling
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isAutoScrolling ? "Auto" : "Manuel"}
              </button>

              {/* Open tab button */}
              {tabsUrl && (
                <button
                  onClick={openTabWindow}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    tabWindowOpen
                      ? "bg-green-500/20 text-green-400"
                      : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                  }`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {tabWindowOpen ? "Tab ouverte" : "Voir la tab"}
                </button>
              )}
            </div>
          </div>

          {/* Section progress bar */}
          <div className="h-2 overflow-hidden rounded-full bg-muted mb-3">
            <div
              className="h-full rounded-full bg-primary transition-all duration-75 ease-linear"
              style={{ width: `${sectionProgress * 100}%` }}
            />
          </div>

          {/* Next section preview */}
          {currentSectionIndex < sections.length - 1 && (
            <p className="text-xs text-muted-foreground mb-3">
              Suivant : <span className="font-medium text-foreground">{sections[currentSectionIndex + 1].name}</span>
            </p>
          )}

          {/* Global progress */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-muted-foreground">Progression globale</span>
              <span className="text-[11px] text-muted-foreground">
                {Math.floor(totalDuration / 60)}:{Math.round(totalDuration % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/50 transition-all duration-75 ease-linear"
                style={{ width: `${globalProgress}%` }}
              />
            </div>
          </div>

          {/* Horizontal section chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {sections.map((section, index) => {
              const isCurrent = index === currentSectionIndex;
              const isPast = index < currentSectionIndex;
              const duration = getSectionDuration(section);

              return (
                <button
                  key={index}
                  ref={isCurrent ? activeRef : null}
                  onClick={() => handleSectionClick(index)}
                  className={`relative shrink-0 rounded-lg px-3 py-1.5 text-left transition-all ${
                    isCurrent
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105"
                      : isPast
                      ? "bg-accent/60 text-muted-foreground"
                      : "bg-accent hover:bg-accent/80 text-foreground"
                  }`}
                >
                  <p className="text-[11px] font-semibold whitespace-nowrap">
                    {section.name}
                  </p>
                  <p className={`text-[11px] whitespace-nowrap ${isCurrent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {Math.floor(duration / 60)}:{Math.round(duration % 60).toString().padStart(2, "0")}
                  </p>
                  {isCurrent && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-lg bg-primary-foreground/20">
                      <div
                        className="h-full bg-primary-foreground/60 transition-all duration-75 ease-linear"
                        style={{ width: `${sectionProgress * 100}%` }}
                      />
                    </div>
                  )}
                  {isPast && (
                    <div className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="h-2 w-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* No sections - just tab link */}
      {sections.length === 0 && tabsUrl && (
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-medium">Tablature disponible</span>
          </div>
          <button
            onClick={openTabWindow}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tabWindowOpen
                ? "bg-green-500/20 text-green-400"
                : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
            }`}
          >
            {tabWindowOpen ? "Tab ouverte" : "Voir la tab"}
          </button>
        </div>
      )}
    </div>
  );
}
