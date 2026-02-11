"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { PitchDetectionResult } from "@/types";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const A4_FREQUENCY = 440;
const MIN_FREQUENCY = 60; // ~B1, lowest guitar note
const MAX_FREQUENCY = 1400; // well above highest guitar note
const RMS_THRESHOLD = 0.015; // noise gate

interface UsePitchDetectionReturn {
  result: PitchDetectionResult | null;
  isActive: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

/**
 * Convert a frequency to the closest musical note with cents deviation.
 */
function frequencyToNote(freq: number): PitchDetectionResult {
  // Number of semitones from A4
  const semitones = 12 * Math.log2(freq / A4_FREQUENCY);
  const roundedSemitones = Math.round(semitones);
  const cents = Math.round((semitones - roundedSemitones) * 100);

  // A4 is MIDI note 69, note index 9 (A) in octave 4
  const midiNote = 69 + roundedSemitones;
  const noteIndex = ((midiNote % 12) + 12) % 12;
  const octave = Math.floor(midiNote / 12) - 1;

  return {
    frequency: Math.round(freq * 10) / 10,
    note: NOTE_NAMES[noteIndex],
    octave,
    cents,
  };
}

/**
 * Autocorrelation-based pitch detection.
 * Finds the fundamental frequency from time-domain audio data.
 */
function detectPitch(buffer: Float32Array, sampleRate: number): number | null {
  // Check signal level (RMS)
  let rms = 0;
  for (let i = 0; i < buffer.length; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / buffer.length);

  if (rms < RMS_THRESHOLD) {
    return null; // Too quiet
  }

  // Autocorrelation
  const bufferLength = buffer.length;
  const correlations = new Float32Array(bufferLength);

  // Min/max lag based on frequency range
  const minLag = Math.floor(sampleRate / MAX_FREQUENCY);
  const maxLag = Math.floor(sampleRate / MIN_FREQUENCY);

  for (let lag = minLag; lag < maxLag && lag < bufferLength; lag++) {
    let sum = 0;
    for (let i = 0; i < bufferLength - lag; i++) {
      sum += buffer[i] * buffer[i + lag];
    }
    correlations[lag] = sum;
  }

  // Find the first peak after the initial decline
  // First, find where the correlation dips below zero (or a threshold)
  let foundDip = false;
  let dipLag = minLag;
  for (let lag = minLag; lag < maxLag && lag < bufferLength; lag++) {
    if (correlations[lag] < 0) {
      foundDip = true;
      dipLag = lag;
      break;
    }
  }

  if (!foundDip) {
    return null;
  }

  // Find the highest peak after the dip
  let bestLag = dipLag;
  let bestCorrelation = -Infinity;

  for (let lag = dipLag; lag < maxLag && lag < bufferLength; lag++) {
    if (correlations[lag] > bestCorrelation) {
      bestCorrelation = correlations[lag];
      bestLag = lag;
    }
  }

  // Quality check: peak must be significant relative to zero-lag correlation
  if (bestCorrelation < correlations[0] * 0.3) {
    return null;
  }

  // Parabolic interpolation for sub-sample accuracy
  const prev = correlations[bestLag - 1] || 0;
  const curr = correlations[bestLag];
  const next = correlations[bestLag + 1] || 0;
  const shift = (prev - next) / (2 * (prev - 2 * curr + next));
  const refinedLag = bestLag + (isFinite(shift) ? shift : 0);

  const frequency = sampleRate / refinedLag;

  if (frequency < MIN_FREQUENCY || frequency > MAX_FREQUENCY) {
    return null;
  }

  return frequency;
}

export function usePitchDetection(): UsePitchDetectionReturn {
  const [result, setResult] = useState<PitchDetectionResult | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const isActiveRef = useRef(false);

  const analyze = useCallback(() => {
    if (!isActiveRef.current || !analyserRef.current || !audioContextRef.current) return;

    const analyser = analyserRef.current;
    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);

    const frequency = detectPitch(buffer, audioContextRef.current.sampleRate);

    if (frequency) {
      setResult(frequencyToNote(frequency));
    } else {
      setResult(null);
    }

    rafRef.current = requestAnimationFrame(analyze);
  }, []);

  const start = useCallback(async () => {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 4096; // Good resolution for low guitar frequencies
      analyser.smoothingTimeConstant = 0.8;

      source.connect(analyser);
      analyserRef.current = analyser;

      isActiveRef.current = true;
      setIsActive(true);

      rafRef.current = requestAnimationFrame(analyze);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("Accès au microphone refusé. Autorise l'accès dans les paramètres de ton navigateur.");
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        setError("Aucun microphone détecté.");
      } else {
        setError("Impossible d'accéder au microphone.");
      }
    }
  }, [analyze]);

  const stop = useCallback(() => {
    isActiveRef.current = false;
    setIsActive(false);
    setResult(null);

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    result,
    isActive,
    error,
    start,
    stop,
  };
}
