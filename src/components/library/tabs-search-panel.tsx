"use client";

import { useState } from "react";
import { ProUpsell } from "@/components/subscription/pro-upsell";
import { extractSongsterrId } from "@/lib/songsterr-url";
import type { TabSource, UserPlan, SongsterrTabStructure } from "@/types";

interface TabsSearchPanelProps {
  title: string;
  artist: string;
  currentTabsUrl: string;
  onSelectTab: (url: string) => void;
  /**
   * L'analyse de la tab, une fois le fichier Guitar Pro lu.
   *
   * `songsterrId` accompagne la structure : c'est lui qui permet de
   * ranger la tab sur le morceau et d'y revenir sans relancer la
   * recherche.
   */
  onTabStructure?: (
    structure: SongsterrTabStructure,
    songsterrId?: number
  ) => void;
  userPlan: UserPlan;
}

export function TabsSearchPanel({
  title,
  artist,
  currentTabsUrl,
  onSelectTab,
  onTabStructure,
  userPlan,
}: TabsSearchPanelProps) {
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<TabSource[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState(currentTabsUrl);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);

  const handleSearch = async () => {
    setSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/tabs/search?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`
      );

      if (!response.ok) {
        throw new Error("Erreur lors de la recherche");
      }

      const data = await response.json();
      setResults(data.sources);
    } catch {
      setError("Erreur lors de la recherche de tablatures");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectAndAnalyze = async (result: TabSource) => {
    onSelectTab(result.url);
    setManualUrl(result.url);

    // Auto-analyze if we have a songsterrId and the callback
    if (onTabStructure && result.songsterrId) {
      setAnalyzingId(result.songsterrId);
      try {
        const response = await fetch(
          `/api/tabs/structure?songsterrId=${result.songsterrId}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.structure) {
            onTabStructure(data.structure, result.songsterrId);
          }
        }
      } catch {
        // Silently fail - user can still manually add sections
      } finally {
        setAnalyzingId(null);
      }
    }
  };

  // Analyze structure from a manually entered Songsterr URL
  const handleAnalyzeUrl = async () => {
    if (!onTabStructure || !manualUrl) return;
    if (!manualUrl.includes("songsterr.com")) return;

    setAnalyzingId(-1); // special value for manual URL analysis
    try {
      const response = await fetch(
        `/api/tabs/structure?url=${encodeURIComponent(manualUrl)}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.structure) {
          onTabStructure(data.structure, extractSongsterrId(manualUrl) ?? undefined);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setAnalyzingId(null);
    }
  };

  const isSongsterrUrl = manualUrl?.includes("songsterr.com");

  return (
    <div className="space-y-4">
      {/* Manual URL input */}
      <div>
        <label className="mb-1 block text-sm font-medium">Lien tablature</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://www.songsterr.com/a/wsa/..."
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
          />
          {manualUrl !== currentTabsUrl && manualUrl && (
            <button
              onClick={() => onSelectTab(manualUrl)}
              className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Sauver
            </button>
          )}
        </div>
        {/* Analyze button for manual Songsterr URL */}
        {onTabStructure && isSongsterrUrl && manualUrl && (
          <button
            onClick={handleAnalyzeUrl}
            disabled={analyzingId !== null}
            className="mt-1.5 flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-50"
          >
            {analyzingId === -1 ? (
              <>
                <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Analyse en cours...
              </>
            ) : (
              <>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Analyser la tab (BPM, sections)
              </>
            )}
          </button>
        )}
      </div>

      {/* Search tabs */}
      {userPlan === "free" ? (
        <ProUpsell
          feature="Recherche de tablatures"
          description="Trouve automatiquement les tablatures sur Songsterr."
          compact
        />
      ) : (
        <>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
          >
            {searching ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Recherche sur Songsterr...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Trouver des tablatures
              </>
            )}
          </button>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {results && results.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                {results.length} résultat{results.length > 1 ? "s" : ""} trouvé{results.length > 1 ? "s" : ""}
              </h4>
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div
                    key={`${result.source}-${index}`}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    {/* Songsterr icon */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold bg-chart-2/10 text-chart-2">
                      S
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{result.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {result.artist}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {/* Analyzing indicator */}
                      {analyzingId === result.songsterrId && (
                        <svg className="h-4 w-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      )}
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                      <button
                        onClick={() => handleSelectAndAnalyze(result)}
                        disabled={analyzingId !== null}
                        className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                      >
                        Utiliser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results && results.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Aucune tablature trouvee pour ce morceau
            </p>
          )}
        </>
      )}
    </div>
  );
}
