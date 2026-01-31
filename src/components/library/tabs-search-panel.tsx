"use client";

import { useState } from "react";
import { ProUpsell } from "@/components/subscription/pro-upsell";
import type { TabSource, UserPlan } from "@/types";

interface TabsSearchPanelProps {
  title: string;
  artist: string;
  currentTabsUrl: string;
  onSelectTab: (url: string) => void;
  userPlan: UserPlan;
}

export function TabsSearchPanel({
  title,
  artist,
  currentTabsUrl,
  onSelectTab,
  userPlan,
}: TabsSearchPanelProps) {
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<TabSource[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState(currentTabsUrl);

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
            placeholder="https://ultimate-guitar.com/..."
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
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
      </div>

      {/* Search tabs */}
      {userPlan === "free" ? (
        <ProUpsell
          feature="Recherche de tablatures"
          description="Trouve automatiquement les tablatures sur Songsterr et Ultimate Guitar."
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
                Recherche...
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
                    {/* Source icon */}
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      result.source === "songsterr"
                        ? "bg-blue-500/10 text-blue-500"
                        : "bg-orange-500/10 text-orange-500"
                    }`}>
                      {result.source === "songsterr" ? "S" : "UG"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{result.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {result.artist}
                        {result.type && ` - ${result.type}`}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
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
                        onClick={() => {
                          onSelectTab(result.url);
                          setManualUrl(result.url);
                        }}
                        className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
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
              Aucune tablature trouvée pour ce morceau
            </p>
          )}
        </>
      )}
    </div>
  );
}
