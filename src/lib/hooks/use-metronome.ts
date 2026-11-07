"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { beatNumberFromStart, countInLabel, nextBeatFromStart, phaseError } from "@/lib/metronome-sync";
import type { TimeSignature, Subdivision } from "@/types";

// Configuration du scheduler Web Audio
const LOOKAHEAD = 25.0; // ms - fréquence de vérification
const SCHEDULE_AHEAD = 0.1; // sec - combien de temps à l'avance planifier les notes
const ALIGN_TOLERANCE = 0.02; // sec - en dessous, on ne touche pas au métronome partagé

interface UseMetronomeOptions {
  initialBpm?: number;
  initialTimeSignature?: TimeSignature;
  initialSubdivision?: Subdivision;
  initialVolume?: number;
  onBeat?: (beat: number, isAccent: boolean) => void;
}

/** Un métronome calé sur une horloge commune (jam). */
export interface MetronomeAlignment {
  /** Instant du premier temps, sur l'horloge commune, en ms. */
  startAt: number;
  /** L'horloge commune. */
  now: () => number;
  bpm: number;
  beatsPerMeasure: number;
  /** Les premiers temps de la grille sont un decompte, avec un autre son. */
  countInBeats?: number;
}

interface UseMetronomeReturn {
  // État
  isPlaying: boolean;
  /** Pendant le decompte : 4, 3, 2, 1 a chaque mesure. Sinon null. */
  countIn: number | null;
  currentBeat: number;
  currentSubdivision: number;
  bpm: number;
  timeSignature: TimeSignature;
  subdivision: Subdivision;
  volume: number;
  accentPattern: number[];
  silentMode: boolean;
  silentBeats: number[];

  // Actions
  start: () => void;
  stop: () => void;
  toggle: () => void;
  /** Démarre sur la grille commune, ou y revient si le métronome a dérivé. */
  alignTo: (alignment: MetronomeAlignment) => void;
  /** Le navigateur retient le son tant qu'on n'a pas touché la page. */
  audioBlocked: boolean;
  unlockAudio: () => void;

  // Config
  setBpm: (bpm: number) => void;
  incrementBpm: (delta: number) => void;
  setTimeSignature: (ts: TimeSignature) => void;
  setSubdivision: (sub: Subdivision) => void;
  setVolume: (vol: number) => void;
  setAccentPattern: (pattern: number[]) => void;
  toggleAccent: (beatIndex: number) => void;
  setSilentMode: (enabled: boolean) => void;
  toggleSilentBeat: (beatIndex: number) => void;

  // Tap tempo
  tap: () => void;
  tapBpm: number | null;
  resetTapTempo: () => void;
}

// Calcule le nombre de subdivisions par beat
function getSubdivisionsPerBeat(subdivision: Subdivision): number {
  switch (subdivision) {
    case "none":
      return 1;
    case "eighth":
      return 2;
    case "triplet":
      return 3;
    case "sixteenth":
      return 4;
  }
}

export function useMetronome(options: UseMetronomeOptions = {}): UseMetronomeReturn {
  const {
    initialBpm = 120,
    initialTimeSignature = { beats: 4, noteValue: 4 },
    initialSubdivision = "none",
    initialVolume = 0.8,
    onBeat,
  } = options;

  // État
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(1);
  const [currentSubdivision, setCurrentSubdivision] = useState(0);
  const [bpm, setBpmState] = useState(initialBpm);
  const [timeSignature, setTimeSignatureState] = useState<TimeSignature>(initialTimeSignature);
  const [subdivision, setSubdivisionState] = useState<Subdivision>(initialSubdivision);
  const [volume, setVolumeState] = useState(initialVolume);
  const [accentPattern, setAccentPatternState] = useState<number[]>(
    () => Array(initialTimeSignature.beats).fill(0).map((_, i) => (i === 0 ? 1 : 0))
  );
  const [silentMode, setSilentModeState] = useState(false);
  const [silentBeats, setSilentBeatsState] = useState<number[]>([]);
  const [tapBpm, setTapBpm] = useState<number | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [countIn, setCountIn] = useState<number | null>(null);

  // Refs pour le scheduler Web Audio
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextNoteTimeRef = useRef(0);
  const currentBeatRef = useRef(0); // 0-indexed pour le scheduler
  const currentSubdivisionRef = useRef(0);
  const isPlayingRef = useRef(false);
  const lastNoteTimeRef = useRef(0);
  const lastAlignmentRef = useRef<MetronomeAlignment | null>(null);
  // Le numero du temps depuis le depart de la grille, pour reconnaitre le decompte.
  const absoluteBeatRef = useRef(0);
  const countInBeatsRef = useRef(0);

  // Refs pour les valeurs actuelles (éviter les closures stales)
  const bpmRef = useRef(bpm);
  const timeSignatureRef = useRef(timeSignature);
  const subdivisionRef = useRef(subdivision);
  const volumeRef = useRef(volume);
  const accentPatternRef = useRef(accentPattern);
  const silentModeRef = useRef(silentMode);
  const silentBeatsRef = useRef(silentBeats);
  const onBeatRef = useRef(onBeat);

  // Tap tempo
  const tapTimesRef = useRef<number[]>([]);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync refs avec state
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    timeSignatureRef.current = timeSignature;
  }, [timeSignature]);

  useEffect(() => {
    subdivisionRef.current = subdivision;
  }, [subdivision]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    accentPatternRef.current = accentPattern;
  }, [accentPattern]);

  useEffect(() => {
    silentModeRef.current = silentMode;
  }, [silentMode]);

  useEffect(() => {
    silentBeatsRef.current = silentBeats;
  }, [silentBeats]);

  useEffect(() => {
    onBeatRef.current = onBeat;
  }, [onBeat]);

  // Planifier une note
  const scheduleNote = useCallback((beat: number, subdivisionIndex: number, time: number, isCountIn = false) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    // Le decompte sonne autrement, sur les temps seulement, meme en mode silence.
    if (isCountIn) {
      if (subdivisionIndex !== 0) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = beat === 0 ? 1568 : 1046;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volumeRef.current, time + 0.001);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.08);
      return;
    }

    const isMainBeat = subdivisionIndex === 0;
    const isAccent = isMainBeat && accentPatternRef.current[beat] === 1;
    const isSilent =
      silentModeRef.current && isMainBeat && silentBeatsRef.current.includes(beat);

    // Ne pas jouer si silencieux
    if (isSilent) return;

    // Créer l'oscillateur
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Fréquence différente pour accent, beat principal ou subdivision
    if (isAccent) {
      osc.frequency.value = 1200; // Accent high
    } else if (isMainBeat) {
      osc.frequency.value = 880; // Beat normal
    } else {
      osc.frequency.value = 660; // Subdivision
      gain.gain.setValueAtTime(volumeRef.current * 0.5, time); // Plus faible
    }

    // Enveloppe courte (click percussif)
    const attackTime = 0.001;
    const decayTime = 0.05;
    const vol = isMainBeat ? volumeRef.current : volumeRef.current * 0.5;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + attackTime);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decayTime);

    // Connecter
    osc.connect(gain);
    gain.connect(ctx.destination);

    // Jouer
    osc.start(time);
    osc.stop(time + decayTime);
  }, []);

  // Avancer à la note suivante
  const nextNote = useCallback(() => {
    const subdivisionsPerBeat = getSubdivisionsPerBeat(subdivisionRef.current);
    const beatsPerMeasure = timeSignatureRef.current.beats;

    // Calculer le temps entre les subdivisions
    const secondsPerBeat = 60.0 / bpmRef.current;
    const secondsPerSubdivision = secondsPerBeat / subdivisionsPerBeat;

    // Avancer le temps
    nextNoteTimeRef.current += secondsPerSubdivision;

    // Avancer la subdivision
    currentSubdivisionRef.current++;

    if (currentSubdivisionRef.current >= subdivisionsPerBeat) {
      currentSubdivisionRef.current = 0;
      currentBeatRef.current++;
      absoluteBeatRef.current++;

      if (currentBeatRef.current >= beatsPerMeasure) {
        currentBeatRef.current = 0;
      }
    }
  }, []);

  // Scheduler principal : une boucle locale qui se rappelle elle-meme.
  // (Le useCallback ne peut pas se citer dans son propre setTimeout : il
  // serait lu avant d'etre declare.)
  const scheduler = useCallback(() => {
    const tick = () => {
      const ctx = audioContextRef.current;
      if (!ctx || !isPlayingRef.current) return;

      while (nextNoteTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD) {
        const isCountIn = absoluteBeatRef.current < countInBeatsRef.current;
        scheduleNote(
          currentBeatRef.current,
          currentSubdivisionRef.current,
          nextNoteTimeRef.current,
          isCountIn
        );
        lastNoteTimeRef.current = nextNoteTimeRef.current;

        // Mettre à jour l'état pour l'UI (seulement sur beat principal)
        if (currentSubdivisionRef.current === 0) {
          const beatForUI = currentBeatRef.current + 1; // 1-indexed
          setCurrentBeat(beatForUI);
          setCountIn(
            countInLabel(absoluteBeatRef.current, countInBeatsRef.current, timeSignatureRef.current.beats)
          );

          const isAccent = accentPatternRef.current[currentBeatRef.current] === 1;
          onBeatRef.current?.(beatForUI, isAccent);
        }
        setCurrentSubdivision(currentSubdivisionRef.current);

        nextNote();
      }

      timerIdRef.current = setTimeout(tick, LOOKAHEAD);
    };
    tick();
  }, [scheduleNote, nextNote]);

  const schedulerRef = useRef(scheduler);

  // Démarrer le métronome
  const start = useCallback(() => {
    if (isPlayingRef.current) return;

    // Créer ou reprendre le contexte audio
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }

    // Réinitialiser les compteurs
    currentBeatRef.current = 0;
    currentSubdivisionRef.current = 0;
    absoluteBeatRef.current = 0;
    countInBeatsRef.current = 0;
    nextNoteTimeRef.current = audioContextRef.current.currentTime + 0.05;

    isPlayingRef.current = true;
    setIsPlaying(true);
    setCurrentBeat(1);
    setCurrentSubdivision(0);

    scheduler();
  }, [scheduler]);

  // Arrêter le métronome
  const stop = useCallback(() => {
    if (timerIdRef.current) {
      clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }

    isPlayingRef.current = false;
    lastAlignmentRef.current = null;
    countInBeatsRef.current = 0;
    setCountIn(null);
    setIsPlaying(false);
    setCurrentBeat(1);
    setCurrentSubdivision(0);
  }, []);

  const alignTo = useCallback((alignment: MetronomeAlignment) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      audioContextRef.current.onstatechange = () => {
        setAudioBlocked(audioContextRef.current?.state === "suspended");
      };
    }
    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") void ctx.resume();
    setAudioBlocked(ctx.state === "suspended");

    lastAlignmentRef.current = alignment;
    const { startAt, now, bpm: gridBpm, beatsPerMeasure } = alignment;
    bpmRef.current = gridBpm;

    const secondsPerBeat = 60 / gridBpm;
    const elapsedSeconds = (now() - startAt) / 1000;
    let { delaySeconds, beatIndex } = nextBeatFromStart(elapsedSeconds, gridBpm, beatsPerMeasure);
    let beatNumber = beatNumberFromStart(elapsedSeconds, gridBpm);

    // Le son sort avec un retard propre a l'appareil (enceinte, Bluetooth) :
    // on le lance d'autant plus tot, pour qu'il s'entende au meme moment.
    const latency = ctx.outputLatency || ctx.baseLatency || 0;
    let target = ctx.currentTime + delaySeconds - latency;
    while (target < ctx.currentTime + 0.01) {
      target += secondsPerBeat;
      delaySeconds += secondsPerBeat;
      beatIndex = (beatIndex + 1) % beatsPerMeasure;
      beatNumber++;
    }

    // Une nouvelle grille sans decompte (tempo change en jouant) l'arrete aussitot.
    countInBeatsRef.current = alignment.countInBeats ?? 0;

    if (isPlayingRef.current) {
      const error = phaseError(nextNoteTimeRef.current, target, secondsPerBeat);
      if (Math.abs(error) < ALIGN_TOLERANCE && currentSubdivisionRef.current === 0) return;
      // Le temps deja planifie partira : pas de second clic juste apres lui.
      if (target - lastNoteTimeRef.current < secondsPerBeat / 2) {
        target += secondsPerBeat;
        beatIndex = (beatIndex + 1) % beatsPerMeasure;
        beatNumber++;
      }
    }

    nextNoteTimeRef.current = target;
    currentBeatRef.current = beatIndex;
    currentSubdivisionRef.current = 0;
    absoluteBeatRef.current = beatNumber;

    if (!isPlayingRef.current) {
      isPlayingRef.current = true;
      setIsPlaying(true);
      schedulerRef.current();
    }
  }, []);

  // Une fois le son debloque, l'horloge audio repart : on se recale aussitot.
  const unlockAudio = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    void ctx.resume().then(() => {
      setAudioBlocked(false);
      if (lastAlignmentRef.current) alignTo(lastAlignmentRef.current);
    });
  }, [alignTo]);

  // Toggle play/stop
  const toggle = useCallback(() => {
    if (isPlayingRef.current) {
      stop();
    } else {
      start();
    }
  }, [start, stop]);

  // Changer le BPM
  const setBpm = useCallback((newBpm: number) => {
    const clampedBpm = Math.max(20, Math.min(300, newBpm));
    setBpmState(clampedBpm);
  }, []);

  // Incrémenter/décrémenter le BPM
  const incrementBpm = useCallback((delta: number) => {
    setBpmState((prev) => Math.max(20, Math.min(300, prev + delta)));
  }, []);

  // Changer la signature temporelle
  const setTimeSignature = useCallback((ts: TimeSignature) => {
    setTimeSignatureState(ts);
    // Réinitialiser le pattern d'accent
    setAccentPatternState(
      Array(ts.beats).fill(0).map((_, i) => (i === 0 ? 1 : 0))
    );
    // Réinitialiser les silent beats
    setSilentBeatsState([]);
  }, []);

  // Changer la subdivision
  const setSubdivision = useCallback((sub: Subdivision) => {
    setSubdivisionState(sub);
  }, []);

  // Changer le volume
  const setVolume = useCallback((vol: number) => {
    setVolumeState(Math.max(0, Math.min(1, vol)));
  }, []);

  // Définir le pattern d'accent
  const setAccentPattern = useCallback((pattern: number[]) => {
    setAccentPatternState(pattern);
  }, []);

  // Toggle accent sur un beat
  const toggleAccent = useCallback((beatIndex: number) => {
    setAccentPatternState((prev) => {
      const newPattern = [...prev];
      newPattern[beatIndex] = newPattern[beatIndex] === 1 ? 0 : 1;
      return newPattern;
    });
  }, []);

  // Activer/désactiver le mode silencieux
  const setSilentMode = useCallback((enabled: boolean) => {
    setSilentModeState(enabled);
    if (!enabled) {
      setSilentBeatsState([]);
    }
  }, []);

  // Toggle silent beat
  const toggleSilentBeat = useCallback((beatIndex: number) => {
    setSilentBeatsState((prev) => {
      if (prev.includes(beatIndex)) {
        return prev.filter((i) => i !== beatIndex);
      } else {
        return [...prev, beatIndex];
      }
    });
  }, []);

  // Tap tempo
  const tap = useCallback(() => {
    const now = performance.now();

    // Réinitialiser le timeout
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }

    // Ajouter le tap
    tapTimesRef.current.push(now);

    // Garder seulement les 8 derniers taps
    if (tapTimesRef.current.length > 8) {
      tapTimesRef.current.shift();
    }

    // Calculer le BPM si au moins 2 taps
    if (tapTimesRef.current.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      const clampedBpm = Math.max(20, Math.min(300, calculatedBpm));

      setTapBpm(clampedBpm);
      setBpmState(clampedBpm);
    }

    // Reset après 2 secondes d'inactivité
    tapTimeoutRef.current = setTimeout(() => {
      tapTimesRef.current = [];
      setTapBpm(null);
    }, 2000);
  }, []);

  // Réinitialiser le tap tempo
  const resetTapTempo = useCallback(() => {
    tapTimesRef.current = [];
    setTapBpm(null);
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      stop();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, [stop]);

  return {
    // État
    isPlaying,
    countIn,
    currentBeat,
    currentSubdivision,
    bpm,
    timeSignature,
    subdivision,
    volume,
    accentPattern,
    silentMode,
    silentBeats,

    // Actions
    start,
    stop,
    toggle,
    alignTo,
    audioBlocked,
    unlockAudio,

    // Config
    setBpm,
    incrementBpm,
    setTimeSignature,
    setSubdivision,
    setVolume,
    setAccentPattern,
    toggleAccent,
    setSilentMode,
    toggleSilentBeat,

    // Tap tempo
    tap,
    tapBpm,
    resetTapTempo,
  };
}
