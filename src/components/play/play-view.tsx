"use client";

import Image from "next/image";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Metronome } from "@/components/practice/metronome/metronome";
import { ExerciseList } from "@/components/practice/exercises/exercise-list";
import { ExerciseDetailModal } from "@/components/practice/exercises/exercise-detail-modal";
import { ExerciseProgress } from "@/components/practice/exercises/exercise-progress";
import { CreateExerciseModal } from "@/components/practice/exercises/create-exercise-modal";
import { SongSelector } from "@/components/practice/song-practice/song-selector";
import { BpmTargetIndicator } from "@/components/practice/song-practice/bpm-target-indicator";
import { TunerSheet } from "@/components/audio/tuner-sheet";
import { SongTabPanel } from "@/components/practice/song-practice/song-tab-panel";
import { WeeklyPlanCard } from "@/components/plan/weekly-plan-card";
import { ResumeCard } from "./resume-card";
import { usePracticeSession } from "@/components/providers/practice-session-provider";
import { TempoLadder, ProgressBar } from "@/components/ui/tempo-ladder";
import { NavIcon } from "@/components/layout/nav-icon";
import { updateSong } from "@/lib/actions/songs";
import { songTargetBpm, slowPracticeFloor } from "@/lib/song-progress";
import type {
  Song,
  ExerciseWithProgress,
  SongPracticeStats,
  PracticeSessionWithSong,
  UserPlan,
  WeeklyPlan,
} from "@/types";

type PlayTab = "song" | "exercises";

/*
 * Deux segments, pas trois. L'accordeur etait le seul onglet qui ne
 * decrivait pas une facon de travailler mais un outil ponctuel : il
 * remplacait tout le contenu, metronome compris, pour une action de
 * trente secondes. Il vit maintenant dans une feuille (TunerSheet),
 * atteignable depuis l'en-tete quel que soit le segment actif.
 */
const TABS: { value: PlayTab; label: string; icon: string }[] = [
  { value: "song", label: "Morceau", icon: "library" },
  { value: "exercises", label: "Exercices", icon: "exercise" },
];

interface PlayViewProps {
  songs: Song[];
  exercises: ExerciseWithProgress[];
  songPracticeStats: Record<string, SongPracticeStats>;
  displayName: string;
  currentFocus: Song | null;
  focusBestBpm: number | null;
  /** La derniere session enregistree, pour reprendre sans rien ressaisir. */
  lastSession: PracticeSessionWithSong | null;
  /** Exercice a ouvrir a l'arrivee — lien profond de la recherche globale. */
  initialExerciseId?: string;
  /**
   * Morceau a ouvrir a l'arrivee (`/jouer?song=<id>`).
   *
   * C'est le lien que posent la bibliotheque et le plan de la semaine :
   * il ouvre le morceau avec sa tab, son tempo et le metronome deja cale.
   */
  initialSongId?: string;
  /** Le plan de la semaine — la raison de revenir le lundi. */
  weeklyPlan: WeeklyPlan | null;
  userPlan: UserPlan;
  isPaid: boolean;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PlayView({
  songs,
  exercises,
  songPracticeStats,
  displayName,
  currentFocus,
  focusBestBpm,
  lastSession,
  initialExerciseId,
  initialSongId,
  weeklyPlan,
  userPlan,
  isPaid,
}: PlayViewProps) {
  const router = useRouter();

  // Arrivee depuis la recherche globale : l'exercice demande ouvre sa
  // fiche des le premier rendu, sur le bon segment.
  const initialExercise =
    exercises.find((exercise) => exercise.id === initialExerciseId) ?? null;

  // Les segments de "Jouer" sont du state, pas des routes : le metronome
  // et le chrono doivent survivre au passage d'un segment a l'autre.
  const [activeTab, setActiveTab] = useState<PlayTab>(
    initialExercise ? "exercises" : "song"
  );

  // Le chrono vient du contexte : il survit a la navigation et sa barre
  // de controle le suit d'un ecran a l'autre.
  const practiceSession = usePracticeSession();
  const isPracticing = practiceSession.isActive;

  /*
   * Le morceau ouvert a l'arrivee.
   *
   * `?song=<id>` gagne sur « le morceau en cours » : c'est un choix
   * explicite — un clic depuis la bibliotheque ou depuis un objectif de la
   * semaine — alors que `currentFocus` n'est qu'un defaut.
   */
  const deepLinkedSong =
    songs.find((song) => song.id === initialSongId) ?? null;

  const [selectedSong, setSelectedSong] = useState<Song | null>(
    deepLinkedSong ?? currentFocus
  );
  const [selectedExercise, setSelectedExercise] =
    useState<ExerciseWithProgress | null>(initialExercise);
  const [exerciseModalOpen, setExerciseModalOpen] = useState(
    Boolean(initialExercise)
  );
  const [createExerciseModalOpen, setCreateExerciseModalOpen] = useState(false);

  /**
   * Le tempo auquel on ouvre un morceau.
   *
   * On reprend la ou on s'est arrete (le meilleur tempo tenu), pas au
   * tempo du disque : caler le metronome sur 168 BPM quand on passe le
   * morceau a 104 n'aide personne. Sans historique, on part du travail
   * lent — 60 % de la cible.
   */
  const workingBpmFor = useCallback(
    (song: Song): number | null => {
      const best = songPracticeStats[song.id]?.bestBpm ?? null;
      if (best) return best;
      const target = songTargetBpm(song);
      return target ? slowPracticeFloor(target.bpm) : null;
    },
    [songPracticeStats]
  );

  const initialBpm = deepLinkedSong ? workingBpmFor(deepLinkedSong) ?? 120 : 120;

  const [currentBpm, setCurrentBpm] = useState(initialBpm);
  const [tunerOpen, setTunerOpen] = useState(false);

  // Le metronome porte son propre tempo : le regler depuis l'exterieur
  // demande une requete explicite, sinon « Reprendre a 96 BPM » lancerait
  // le chrono en laissant le metronome sur 120.
  const [bpmRequest, setBpmRequest] = useState<{ bpm: number; id: number } | null>(
    // Arrive par lien profond : le metronome est cale des le premier rendu.
    // Passer par un effet ferait battre 120 BPM pendant une frame.
    deepLinkedSong && initialBpm ? { bpm: initialBpm, id: 0 } : null
  );

  const firstName = displayName.split(" ")[0];

  // La cible passe par le meme helper partout : reglage manuel, puis
  // tempo de la tablature, puis Spotify. La tablature manquait ici.
  const focusTargetBpm = currentFocus
    ? songTargetBpm(currentFocus)?.bpm
    : undefined;

  /*
   * Le morceau qu'on reprend vient de la derniere session enregistree,
   * pas du premier morceau « en cours » de la bibliotheque : c'est ce
   * qu'on travaillait, dans l'ordre ou on l'a travaille.
   *
   * Le morceau peut avoir ete supprime depuis (`song` a null) : on retombe
   * alors sur la carte « En cours ».
   */
  const resumeSong = lastSession?.song ?? null;

  const resumeTargetBpm = resumeSong
    ? songTargetBpm(resumeSong)?.bpm
    : undefined;

  // Le tempo atteint la derniere fois est le bon point de reprise. Sans
  // lui, la cible du morceau ; sans cible, le metronome ne bouge pas.
  const resumeBpm =
    lastSession?.bpm_achieved ??
    songPracticeStats[resumeSong?.id ?? ""]?.bestBpm ??
    resumeTargetBpm ??
    null;

  const handleResume = useCallback(() => {
    if (!resumeSong) return;

    setActiveTab("song");
    setSelectedSong(resumeSong);

    if (resumeBpm !== null) {
      setCurrentBpm(resumeBpm);
      setBpmRequest({ bpm: resumeBpm, id: Date.now() });
    }

    practiceSession.start({
      songId: resumeSong.id,
      exerciseId: null,
      bpm: resumeBpm ?? currentBpm,
    });
  }, [practiceSession, resumeSong, resumeBpm, currentBpm]);

  const startSession = useCallback(() => {
    practiceSession.start({
      songId: activeTab === "song" ? selectedSong?.id ?? null : null,
      exerciseId: activeTab === "exercises" ? selectedExercise?.id ?? null : null,
      bpm: currentBpm,
    });
  }, [practiceSession, activeTab, selectedSong, selectedExercise, currentBpm]);

  const handleStartExercisePractice = useCallback(
    (exercise: ExerciseWithProgress, bpm: number) => {
      setSelectedExercise(exercise);
      setCurrentBpm(bpm);
      setExerciseModalOpen(false);
      setActiveTab("exercises");
    },
    []
  );

  const handleUpdateTargetBpm = useCallback(
    async (songId: string, targetBpm: number) => {
      await updateSong(songId, { target_bpm: targetBpm });
      router.refresh();
    },
    [router]
  );

  /**
   * Choisir un morceau cale le metronome.
   *
   * C'etait le trou du pont annonce en v3.0 : on selectionnait un morceau
   * et le metronome restait sur 120, a charge pour le guitariste d'aller
   * lire le tempo ailleurs et de le ressaisir.
   */
  const handleSelectSong = useCallback(
    (song: Song | null) => {
      setSelectedSong(song);
      if (!song) return;
      const bpm = workingBpmFor(song);
      if (bpm !== null) {
        setCurrentBpm(bpm);
        setBpmRequest({ bpm, id: Date.now() });
      }
      // Le chrono deja lance doit suivre le morceau qu'on regarde.
      if (practiceSession.isActive) {
        practiceSession.setSongId(song.id);
        if (bpm !== null) practiceSession.setBpm(bpm);
      }
    },
    [workingBpmFor, practiceSession]
  );

  /** Regler le metronome depuis un panneau, sans changer de morceau. */
  const handleRequestBpm = useCallback((bpm: number) => {
    setCurrentBpm(bpm);
    setBpmRequest({ bpm, id: Date.now() });
  }, []);

  /** Un objectif de la semaine qui designe un morceau ouvre ce morceau. */
  const handleWorkOnSong = useCallback(
    (songId: string) => {
      const song = songs.find((item) => item.id === songId);
      if (!song) return;
      setActiveTab("song");
      handleSelectSong(song);
    },
    [songs, handleSelectSong]
  );

  return (
    <div className="space-y-6">
      {/* En-tete */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold lg:text-3xl">
            Salut, {firstName}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Métronome, exercices et accordeur
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* L'accordeur : une action sur la vue, pas une destination */}
          <button
            onClick={() => setTunerOpen(true)}
            aria-haspopup="dialog"
            className="flex min-h-[44px] items-center gap-2 rounded-xl border border-input px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <NavIcon icon="tuner" className="h-5 w-5 shrink-0" />
            Accordeur
          </button>

          {!isPracticing ? (
            <button
              onClick={startSession}
              className="flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">timer</span>
              Démarrer une session
            </button>
          ) : (
            /*
              Session en cours : le chrono et ses commandes sont dans la
              barre du bas, qui suit d'un ecran a l'autre. Les dupliquer
              ici donnerait deux boutons "Terminer" pour une seule session.
            */
            <p className="flex min-h-[44px] items-center gap-2 rounded-xl bg-primary/15 px-3.5 py-2 text-sm font-medium text-primary">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-[18px]"
              >
                timer
              </span>
              <span className="tabular">
                {formatDuration(practiceSession.elapsedSeconds)}
              </span>
            </p>
          )}
        </div>
      </div>

      {/*
        Le plan de la semaine ouvre l'ecran.

        « Reprendre » dit quoi refaire ; le plan dit quoi viser. C'est la
        seule chose de cette page qui regarde devant, et la raison de
        rouvrir l'app un lundi matin.
      */}
      {weeklyPlan && (
        <WeeklyPlanCard plan={weeklyPlan} onWorkOnSong={handleWorkOnSong} />
      )}

      {/*
        Reprendre passe avant « En cours » : c'est la meme place a l'ecran,
        mais avec le tempo, les sections et un bouton qui fait tout.
      */}
      {resumeSong && lastSession ? (
        <ResumeCard
          session={lastSession}
          song={resumeSong}
          bpm={resumeBpm}
          bestBpm={songPracticeStats[resumeSong.id]?.bestBpm ?? null}
          targetBpm={resumeTargetBpm}
          disabled={isPracticing}
          onResume={handleResume}
        />
      ) : null}

      {/* Morceau en cours : la carte qui ouvrait le dashboard */}
      {!resumeSong && currentFocus && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            En cours
          </p>
          <div className="flex items-center gap-4">
            {currentFocus.cover_url ? (
              <Image
                src={currentFocus.cover_url}
                alt=""
                className="h-16 w-16 rounded-xl object-cover"
                width={64}
                height={64}
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                <span className="material-symbols-outlined text-2xl text-primary">
                  music_note
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold">{currentFocus.title}</h2>
              <p className="truncate text-sm text-muted-foreground">
                {currentFocus.artist}
              </p>
              <div className="mt-2">
                {focusTargetBpm ? (
                  <TempoLadder
                    targetBpm={focusTargetBpm}
                    achievedBpm={focusBestBpm}
                    showScale={false}
                  />
                ) : (
                  <ProgressBar percent={currentFocus.progress_percent} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Segments */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-accent/50 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            aria-current={activeTab === tab.value ? "page" : undefined}
            className={`flex min-h-[40px] flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <NavIcon icon={tab.icon} className="h-4 w-4 shrink-0" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <Metronome
          initialBpm={currentBpm}
          bpmRequest={bpmRequest}
          onBpmChange={setCurrentBpm}
          onPlayingChange={() => {}}
        />

        <div className="rounded-2xl border border-border bg-card/50 p-4">
          {activeTab === "song" && (
            <div className="space-y-4">
              {selectedSong ? (
                <>
                  <BpmTargetIndicator
                    song={selectedSong}
                    currentBpm={currentBpm}
                    practiceStats={songPracticeStats[selectedSong.id]}
                  />
                  {/*
                    La tab, le tempo de la partition et les sections, sur
                    le meme ecran que le metronome : c'est tout le pont
                    Songsterr/Spotify annonce en v3.0.
                  */}
                  <SongTabPanel
                    song={selectedSong}
                    currentBpm={currentBpm}
                    onRequestBpm={handleRequestBpm}
                    userPlan={userPlan}
                  />
                </>
              ) : (
                <div className="rounded-lg bg-accent/50 p-4 text-center text-sm text-muted-foreground">
                  Sélectionne un morceau pour voir ta progression
                </div>
              )}

              <SongSelector
                songs={songs}
                selectedSong={selectedSong}
                onSelectSong={handleSelectSong}
                onUpdateTargetBpm={handleUpdateTargetBpm}
              />
            </div>
          )}

          {activeTab === "exercises" && (
            <div className="space-y-4">
              {selectedExercise && isPracticing && (
                <ExerciseProgress
                  exercise={selectedExercise}
                  currentBpm={currentBpm}
                  className="mb-4"
                />
              )}

              <ExerciseList
                exercises={exercises}
                onSelectExercise={(exercise) => {
                  setSelectedExercise(exercise);
                  setExerciseModalOpen(true);
                }}
                onCreateExercise={() => setCreateExerciseModalOpen(true)}
              />
            </div>
          )}
        </div>
      </div>

      {selectedExercise && (
        <ExerciseDetailModal
          exercise={selectedExercise}
          isOpen={exerciseModalOpen}
          onClose={() => setExerciseModalOpen(false)}
          onStartPractice={handleStartExercisePractice}
        />
      )}

      <CreateExerciseModal
        isOpen={createExerciseModalOpen}
        onClose={() => setCreateExerciseModalOpen(false)}
      />

      <TunerSheet
        isOpen={tunerOpen}
        onClose={() => setTunerOpen(false)}
        isPaid={isPaid}
      />
    </div>
  );
}
