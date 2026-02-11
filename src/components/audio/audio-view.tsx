"use client";

import { useState } from "react";
import { SongIdentifier } from "./song-identifier";
import { GuitarTuner } from "./guitar-tuner";

type AudioTab = "identifier" | "tuner";

export function AudioView() {
  const [activeTab, setActiveTab] = useState<AudioTab>("identifier");

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Reconnaissance Audio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Identifie des morceaux ou accorde ta guitare
        </p>
      </div>

      {/* Tab switcher */}
      <div className="mb-6 flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab("identifier")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "identifier"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Identifier
          </span>
        </button>
        <button
          onClick={() => setActiveTab("tuner")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "tuner"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4m0 12v4" strokeLinecap="round" />
              <path d="M2 12h4m12 0h4" strokeLinecap="round" />
            </svg>
            Accordeur
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-border bg-card">
        {activeTab === "identifier" ? <SongIdentifier /> : <GuitarTuner />}
      </div>
    </div>
  );
}
