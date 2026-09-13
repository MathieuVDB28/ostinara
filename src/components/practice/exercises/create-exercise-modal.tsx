"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createExercise } from "@/lib/actions/exercises";
import { EXERCISE_CATEGORY_LABELS } from "@/types";
import type { ExerciseCategory, ExerciseDifficulty } from "@/types";

interface CreateExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DIFFICULTY_OPTIONS: { value: ExerciseDifficulty; label: string }[] = [
  { value: "beginner", label: "Débutant" },
  { value: "intermediate", label: "Intermédiaire" },
  { value: "advanced", label: "Avancé" },
  { value: "expert", label: "Expert" },
];

const CATEGORY_OPTIONS = Object.entries(EXERCISE_CATEGORY_LABELS).map(
  ([value, label]) => ({ value: value as ExerciseCategory, label })
);

const TIME_SIGNATURE_OPTIONS = ["4/4", "3/4", "6/8", "2/4", "5/4", "7/8", "12/8"];

export function CreateExerciseModal({ isOpen, onClose }: CreateExerciseModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExerciseCategory>("technique");
  const [difficulty, setDifficulty] = useState<ExerciseDifficulty>("beginner");
  const [startingBpm, setStartingBpm] = useState(60);
  const [targetBpm, setTargetBpm] = useState(120);
  const [bpmIncrement, setBpmIncrement] = useState(5);
  const [timeSignature, setTimeSignature] = useState("4/4");
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [tips, setTips] = useState<string[]>([""]);
  const [sharedWithFriends, setSharedWithFriends] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategory("technique");
    setDifficulty("beginner");
    setStartingBpm(60);
    setTargetBpm(120);
    setBpmIncrement(5);
    setTimeSignature("4/4");
    setDurationMinutes(5);
    setInstructions([""]);
    setTips([""]);
    setSharedWithFriends(false);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Le nom de l'exercice est requis");
      return;
    }

    if (startingBpm >= targetBpm) {
      setError("Le BPM de départ doit être inférieur au BPM cible");
      return;
    }

    setLoading(true);

    const result = await createExercise({
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      difficulty,
      starting_bpm: startingBpm,
      target_bpm: targetBpm,
      bpm_increment: bpmIncrement,
      time_signature: timeSignature,
      instructions: instructions.filter((i) => i.trim()),
      tips: tips.filter((t) => t.trim()),
      duration_minutes: durationMinutes,
      shared_with_friends: sharedWithFriends,
    });

    setLoading(false);

    if (result.success) {
      resetForm();
      onClose();
      router.refresh();
    } else {
      setError(result.error || "Une erreur est survenue");
    }
  };

  const addInstruction = () => setInstructions([...instructions, ""]);
  const removeInstruction = (index: number) =>
    setInstructions(instructions.filter((_, i) => i !== index));
  const updateInstruction = (index: number, value: string) =>
    setInstructions(instructions.map((v, i) => (i === index ? value : v)));

  const addTip = () => setTips([...tips, ""]);
  const removeTip = (index: number) => setTips(tips.filter((_, i) => i !== index));
  const updateTip = (index: number, value: string) =>
    setTips(tips.map((v, i) => (i === index ? value : v)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold">Créer un exercice</h2>
          <button aria-label="Fermer"
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:bg-accent"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Nom */}
            <div>
              <label className="mb-1 block text-sm font-medium">Nom *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Gamme blues en La"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez l'exercice..."
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none"
              />
            </div>

            {/* Catégorie + Difficulté */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Catégorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExerciseCategory)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Difficulté</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as ExerciseDifficulty)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* BPM Settings */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">BPM départ</label>
                <input
                  type="number"
                  value={startingBpm}
                  onChange={(e) => setStartingBpm(Number(e.target.value))}
                  min={20}
                  max={300}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">BPM cible</label>
                <input
                  type="number"
                  value={targetBpm}
                  onChange={(e) => setTargetBpm(Number(e.target.value))}
                  min={20}
                  max={300}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Incrément</label>
                <input
                  type="number"
                  value={bpmIncrement}
                  onChange={(e) => setBpmIncrement(Number(e.target.value))}
                  min={1}
                  max={20}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Time Signature + Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Signature</label>
                <select
                  value={timeSignature}
                  onChange={(e) => setTimeSignature(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  {TIME_SIGNATURE_OPTIONS.map((ts) => (
                    <option key={ts} value={ts}>{ts}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Durée (min)</label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  min={1}
                  max={120}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Instructions */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-medium">Instructions</label>
                <button
                  type="button"
                  onClick={addInstruction}
                  className="text-xs text-primary hover:underline"
                >
                  + Ajouter
                </button>
              </div>
              <div className="space-y-2">
                {instructions.map((instruction, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={instruction}
                      onChange={(e) => updateInstruction(index, e.target.value)}
                      placeholder={`Étape ${index + 1}...`}
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                    />
                    {instructions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInstruction(index)}
                        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-medium">Conseils</label>
                <button
                  type="button"
                  onClick={addTip}
                  className="text-xs text-primary hover:underline"
                >
                  + Ajouter
                </button>
              </div>
              <div className="space-y-2">
                {tips.map((tip, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-primary">•</span>
                    <input
                      type="text"
                      value={tip}
                      onChange={(e) => updateTip(index, e.target.value)}
                      placeholder={`Conseil ${index + 1}...`}
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                    />
                    {tips.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTip(index)}
                        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Share toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-accent/30 p-3">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium">Partager avec mes amis</p>
                  <p className="text-xs text-muted-foreground">
                    Vos amis pourront voir et pratiquer cet exercice
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSharedWithFriends(!sharedWithFriends)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  sharedWithFriends ? "bg-violet-500" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    sharedWithFriends ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 border-t border-border p-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Créer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
