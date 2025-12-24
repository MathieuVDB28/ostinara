"use client";

import { useState, useEffect, useCallback } from "react";
import { VideoUpload } from "./video-upload";
import { createCover, canUploadCover } from "@/lib/actions/covers";
import type { Song, CoverVisibility } from "@/types";

interface AddCoverModalProps {
  song: Song;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const visibilityOptions: { value: CoverVisibility; label: string }[] = [
  { value: "private", label: "Privé" },
  { value: "friends", label: "Amis" },
  { value: "public", label: "Public" },
];

export function AddCoverModal({ song, isOpen, onClose, onSuccess }: AddCoverModalProps) {
  const [step, setStep] = useState<"upload" | "details">("upload");
  const [uploadedFile, setUploadedFile] = useState<{
    url: string;
    mediaType: "video" | "audio";
    fileSize: number;
  } | null>(null);
  const [visibility, setVisibility] = useState<CoverVisibility>("friends");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canUpload, setCanUpload] = useState<{ allowed: boolean; limit?: number; current?: number }>({ allowed: true });

  useEffect(() => {
    if (isOpen) {
      canUploadCover().then(setCanUpload);
    }
  }, [isOpen]);

  const handleUploadComplete = (result: typeof uploadedFile) => {
    setUploadedFile(result);
    setStep("details");
    setError(null);
  };

  const handleSave = async () => {
    if (!uploadedFile) return;

    setSaving(true);
    setError(null);

    const result = await createCover({
      song_id: song.id,
      media_url: uploadedFile.url,
      media_type: uploadedFile.mediaType,
      file_size_bytes: uploadedFile.fileSize,
      visibility,
      description: description || undefined,
    });

    if (result.success) {
      onSuccess();
      handleClose();
    } else {
      setError(result.error || "Erreur lors de l'ajout");
    }

    setSaving(false);
  };

  const handleClose = useCallback(() => {
    setStep("upload");
    setUploadedFile(null);
    setVisibility("friends");
    setDescription("");
    setError(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {step === "upload" ? "Ajouter un cover" : "Détails du cover"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {song.title} - {song.artist}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Limite pour les utilisateurs free */}
        {!canUpload.allowed ? (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
            {canUpload.limit && canUpload.current !== undefined && (
              <p>Tu as atteint la limite de {canUpload.limit} covers ({canUpload.current}/{canUpload.limit}). Passe en Pro pour en ajouter plus !</p>
            )}
          </div>
        ) : canUpload.limit && canUpload.current !== undefined && (
          <div className="mb-4 text-sm text-muted-foreground">
            {canUpload.current}/{canUpload.limit} covers utilisés
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
            {error}
          </div>
        )}

        {step === "upload" ? (
          <VideoUpload
            songId={song.id}
            onUploadComplete={handleUploadComplete}
            onError={setError}
            disabled={!canUpload.allowed}
          />
        ) : (
          <div className="space-y-4">
            {/* Aperçu vidéo */}
            {uploadedFile && uploadedFile.mediaType === "video" && (
              <video
                src={uploadedFile.url}
                controls
                className="w-full rounded-lg"
              />
            )}

            {uploadedFile && uploadedFile.mediaType === "audio" && (
              <div className="rounded-lg bg-muted p-4">
                <audio src={uploadedFile.url} controls className="w-full" />
              </div>
            )}

            {/* Visibilité */}
            <div>
              <label className="mb-2 block text-sm font-medium">Visibilité</label>
              <div className="flex gap-2">
                {visibilityOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setVisibility(option.value)}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                      visibility === option.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-accent"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-sm font-medium">Description (optionnel)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ajoute une description..."
                rows={3}
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep("upload")}
                className="flex-1 rounded-lg border border-border py-2.5 font-medium transition-colors hover:bg-accent"
              >
                Retour
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-lg bg-primary py-2.5 font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Publication..." : "Publier"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
