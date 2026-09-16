"use client";

import Image from "next/image";
import { useState } from "react";
import { usePracticeSession } from "@/components/providers/practice-session-provider";
import type { Song } from "@/types";

interface PracticeTimerProps {
  songs: Song[];
}

/**
 * Le cadran de la page Progression.
 *
 * Il portait son propre etat et sa propre cle localStorage, en parallele
 * du chrono de "Jouer" : on pouvait en lancer deux a la fois sans que
 * l'un sache que l'autre tournait. Il ne garde plus que son affichage —
 * l'etat vient de PracticeSessionProvider, partage par toute l'app.
 */
export function PracticeTimer({ songs }: PracticeTimerProps) {
  const {
    status,
    isActive,
    elapsedMs,
    songId,
    start,
    pause,
    resume,
    stop,
    cancel,
    setSongId,
  } = usePracticeSession();

  const [showSongSelector, setShowSongSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedSong = songId
    ? songs.find((song) => song.id === songId) ?? null
    : null;

  const timerState = {
    isRunning: status === "running",
    isPaused: status === "paused",
    elapsed: elapsedMs,
  };

  const setSelectedSong = (song: Song | null) => setSongId(song?.id ?? null);

  // Un chrono lance depuis ce cadran demarre sur le morceau affiche.
  const handleStart = () => start({ songId: selectedSong?.id ?? null });

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getTimerColor = (): string => {
    const minutes = timerState.elapsed / 60000;
    if (minutes < 30) return "text-primary";
    if (minutes < 60) return "text-primary";
    return "text-primary";
  };

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      {/* Timer Display */}
      <div className="flex flex-col items-center">
        {/* Cercle du timer */}
        <div
          className={`
            relative flex h-48 w-48 items-center justify-center rounded-full
            border-4 transition-all duration-300
            ${timerState.isRunning
              ? "border-primary animate-pulse shadow-lg shadow-primary/20"
              : timerState.isPaused
                ? "border-primary"
                : "border-border"
            }
          `}
        >
          <div className="text-center">
            <span className={`text-4xl font-bold tabular-nums ${isActive ? getTimerColor() : "text-foreground"}`}>
              {formatTime(timerState.elapsed)}
            </span>
            {timerState.isPaused && (
              <p className="mt-1 text-sm text-primary">En pause</p>
            )}
          </div>
        </div>

        {/* Contrôles */}
        <div className="mt-6 flex items-center gap-4">
          {!isActive ? (
            <button aria-label="Démarrer la session"
              onClick={handleStart}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              title="Démarrer"
            >
              <svg className="h-6 w-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          ) : (
            <>
              {timerState.isRunning ? (
                <button aria-label="Mettre la session en pause"
                  onClick={pause}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105"
                  title="Pause"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                </button>
              ) : (
                <button aria-label="Reprendre la session"
                  onClick={resume}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105"
                  title="Reprendre"
                >
                  <svg className="h-6 w-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              )}

              <button aria-label="Terminer et enregistrer la session"
                onClick={stop}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-success text-success-foreground shadow-lg transition-all hover:scale-105"
                title="Terminer et enregistrer"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>

              <button aria-label="Annuler la session"
                onClick={cancel}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all hover:bg-destructive hover:text-destructive-foreground"
                title="Annuler"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Sélecteur de morceau */}
        <div className="mt-6 w-full">
          {selectedSong ? (
            <button
              onClick={() => !isActive && setShowSongSelector(true)}
              disabled={isActive}
              className={`
                w-full flex items-center gap-3 rounded-xl border border-border bg-muted p-3 text-left
                transition-all
                ${!isActive ? "hover:border-primary/50 cursor-pointer" : "opacity-75 cursor-not-allowed"}
              `}
            >
              {selectedSong.cover_url ? (
                <Image
                  src={selectedSong.cover_url}
                  alt={selectedSong.title}
                  className="h-12 w-12 rounded-lg object-cover"
                  width={48}
                  height={48}
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
                  <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedSong.title}</p>
                <p className="text-sm text-muted-foreground truncate">{selectedSong.artist}</p>
              </div>
              {!isActive && (
                <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                </svg>
              )}
            </button>
          ) : (
            <button
              onClick={() => setShowSongSelector(true)}
              disabled={isActive}
              className={`
                w-full rounded-xl border border-dashed border-border p-4 text-center
                transition-all
                ${!isActive ? "hover:border-primary hover:bg-primary/5 cursor-pointer" : "opacity-75 cursor-not-allowed"}
              `}
            >
              <p className="text-muted-foreground">
                {isActive ? "Aucun morceau sélectionné" : "Choisir un morceau (optionnel)"}
              </p>
            </button>
          )}
        </div>
      </div>

      {/* Modal de sélection de morceau */}
      {showSongSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowSongSelector(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Choisir un morceau</h3>
              <button
                onClick={() => setShowSongSelector(false)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Recherche */}
            <div className="relative mb-4">
              <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm focus:border-primary"
              />
            </div>

            {/* Option session libre */}
            <button
              onClick={() => {
                setSelectedSong(null);
                setShowSongSelector(false);
              }}
              className="mb-2 w-full rounded-lg border border-dashed border-border p-3 text-left text-sm text-muted-foreground hover:border-primary hover:bg-primary/5"
            >
              Session libre (sans morceau)
            </button>

            {/* Liste des morceaux */}
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {filteredSongs.map((song) => (
                <button
                  key={song.id}
                  onClick={() => {
                    setSelectedSong(song);
                    setShowSongSelector(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 rounded-lg p-2 text-left transition-all
                    ${selectedSong?.id === song.id
                      ? "bg-primary/10 border border-primary"
                      : "hover:bg-accent"
                    }
                  `}
                >
                  {song.cover_url ? (
                    <Image
                      src={song.cover_url}
                      alt={song.title}
                      className="h-10 w-10 rounded-md object-cover"
                      width={40}
                      height={40}
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                      <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{song.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                  </div>
                </button>
              ))}

              {filteredSongs.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Aucun morceau trouvé
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
