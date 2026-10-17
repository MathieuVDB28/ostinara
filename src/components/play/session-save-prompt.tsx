"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createRoutineWithItems } from "@/lib/actions/routines";
import { createSetlistWithItems, type SaveSessionItemInput } from "@/lib/actions/setlists";

interface SessionSavePromptProps {
  items: SaveSessionItemInput[];
  onClose: () => void;
}

type Mode = "choice" | "routine" | "setlist";

/**
 * Fin d'une session jouee depuis un deroule : on propose d'en garder
 * l'enchainement — une routine (pour le retravailler) ou une setlist
 * (pour la scene). « Non merci » ne garde rien : la session reste juste
 * enregistree dans le journal, comme avant.
 */
export function SessionSavePrompt({ items, onClose }: SessionSavePromptProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choice");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const songCount = items.filter((i) => i.item_type === "song").length;
  const exerciseCount = items.filter((i) => i.item_type === "exercise").length;

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    const result =
      mode === "routine"
        ? await createRoutineWithItems(name.trim(), items)
        : await createSetlistWithItems(name.trim(), items);

    setSaving(false);

    if (result.success) {
      router.refresh();
      onClose();
    } else {
      setError(result.error || "Erreur lors de l'enregistrement");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-md">
        <button
          aria-label="Fermer"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
        >
          <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
        </button>

        <h2 className="font-display text-3xl font-extrabold uppercase leading-none">
          Session terminée
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {songCount > 0 && (
            <>
              {songCount} morceau{songCount > 1 ? "x" : ""}
            </>
          )}
          {songCount > 0 && exerciseCount > 0 && " · "}
          {exerciseCount > 0 && (
            <>
              {exerciseCount} exo{exerciseCount > 1 ? "s" : ""}
            </>
          )}
          {" — tu veux garder cet enchaînement ?"}
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {mode === "choice" ? (
          <div className="mt-5 space-y-2">
            <button
              onClick={() => setMode("routine")}
              className="w-full rounded-xl bg-foreground px-4 py-3 text-left text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              En faire une routine
              <span className="mt-0.5 block text-xs font-normal opacity-70">
                Pour la retravailler — dispo dans ton Carnet.
              </span>
            </button>
            <button
              onClick={() => setMode("setlist")}
              className="w-full rounded-xl border border-border px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-accent"
            >
              En faire une setlist
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                Pour la scène — dispo dans Commu › Groupes.
              </span>
            </button>
            <button
              onClick={onClose}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Non merci
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder={
                mode === "routine" ? "Nom de la routine" : "Nom de la setlist"
              }
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:border-primary"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setMode("choice")}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
              >
                Retour
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving
                  ? "Enregistrement..."
                  : mode === "routine"
                  ? "Enregistrer la routine"
                  : "Enregistrer la setlist"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
