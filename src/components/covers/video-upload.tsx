"use client";

import { useState, useRef } from "react";

interface VideoUploadProps {
  songId: string;
  onUploadComplete: (result: {
    url: string;
    mediaType: "video" | "audio";
    fileSize: number;
  }) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB

export function VideoUpload({ songId, onUploadComplete, onError, disabled }: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      onError("Le fichier dépasse la limite de 200 Mo");
      return;
    }

    const isVideo = file.type.startsWith("video/");
    const isAudio = file.type.startsWith("audio/");

    if (!isVideo && !isAudio) {
      onError("Seuls les fichiers vidéo et audio sont acceptés");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("songId", songId);

      // Utiliser XMLHttpRequest pour le suivi de progression
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setProgress(percent);
        }
      });

      const response = await new Promise<{ success: boolean; url?: string; mediaType?: "video" | "audio"; fileSize?: number; error?: string }>((resolve, reject) => {
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.response);
            resolve(data);
          } catch {
            reject(new Error("Erreur de parsing"));
          }
        };
        xhr.onerror = () => reject(new Error("Erreur réseau"));
        xhr.open("POST", "/api/covers/upload");
        xhr.send(formData);
      });

      if (!response.success || !response.url) {
        throw new Error(response.error || "Erreur lors de l'upload");
      }

      onUploadComplete({
        url: response.url,
        mediaType: response.mediaType || "video",
        fileSize: response.fileSize || file.size,
      });
    } catch (error) {
      onError(error instanceof Error ? error.message : "Erreur lors de l'upload");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    if (disabled || uploading) return;

    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed transition-colors ${
        dragActive ? "border-primary bg-primary/5" : "border-border"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary/50"}`}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && !uploading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*,audio/*"
        onChange={handleChange}
        disabled={disabled || uploading}
        className="hidden"
      />

      <div className="p-8 text-center">
        {uploading ? (
          <div className="space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <svg className="h-6 w-6 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
            <div>
              <p className="font-medium">Upload en cours...</p>
              <p className="text-sm text-muted-foreground">{progress}%</p>
            </div>
            <div className="mx-auto max-w-xs h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="font-medium">Glisse ta vidéo ici</p>
            <p className="mt-1 text-sm text-muted-foreground">
              ou clique pour sélectionner (max 200 Mo)
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              MP4, WebM, MOV, MP3, WAV
            </p>
          </>
        )}
      </div>
    </div>
  );
}
