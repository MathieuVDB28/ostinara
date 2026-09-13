"use client";

import { useState, useRef } from "react";
import * as tus from "tus-js-client";
import { createClient } from "@/lib/supabase/client";
import { needsCompression } from "@/lib/video-compression";

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

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB (avant compression)
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/webm"];

type UploadPhase = "idle" | "compressing" | "uploading";

export function VideoUpload({ songId, onUploadComplete, onError, disabled }: VideoUploadProps) {
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<tus.Upload | null>(null);

  const busy = phase !== "idle";

  const handleFileSelect = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      onError("Le fichier dépasse la limite de 500 Mo");
      return;
    }

    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
    const isAudio = ALLOWED_AUDIO_TYPES.includes(file.type);

    if (!isVideo && !isAudio) {
      onError("Seuls les fichiers vidéo et audio sont acceptés (MP4, WebM, MOV, MP3, WAV)");
      return;
    }

    try {
      let fileToUpload = file;

      // Compression si nécessaire (vidéo > 50 MB)
      if (needsCompression(file)) {
        setPhase("compressing");
        setProgress(0);
        setStatusMessage("Chargement du moteur de compression...");

        // @ffmpeg n'est telecharge qu'ici, quand une compression est
        // reellement necessaire.
        const { compressVideo } = await import("@/lib/video-compression");
        fileToUpload = await compressVideo(
          file,
          (p) => {
            setProgress(p);
            setStatusMessage(`Compression en cours... ${p}%`);
          },
          (msg) => setStatusMessage(msg)
        );
      }

      // Upload
      setPhase("uploading");
      setProgress(0);
      setStatusMessage("Upload en cours...");

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        onError("Non authentifié");
        return;
      }

      const timestamp = Date.now();
      const ext = fileToUpload.name.split(".").pop() || (isVideo ? "mp4" : "mp3");
      const filePath = `${session.user.id}/${songId}/${timestamp}.${ext}`;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(fileToUpload, {
          endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
          retryDelays: [0, 1000, 3000, 5000],
          headers: {
            authorization: `Bearer ${session.access_token}`,
            "x-upsert": "false",
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: "covers",
            objectName: filePath,
            contentType: fileToUpload.type,
            cacheControl: "3600",
          },
          chunkSize: 6 * 1024 * 1024,
          onError: (err) => {
            reject(new Error(err.message || "Erreur lors de l'upload"));
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const p = Math.round((bytesUploaded / bytesTotal) * 100);
            setProgress(p);
            setStatusMessage(`Upload en cours... ${p}%`);
          },
          onSuccess: () => {
            resolve();
          },
        });

        uploadRef.current = upload;
        upload.findPreviousUploads().then((previousUploads) => {
          if (previousUploads.length > 0) {
            upload.resumeFromPreviousUpload(previousUploads[0]);
          } else {
            upload.start();
          }
        });
      });

      const { data: { publicUrl } } = supabase.storage
        .from("covers")
        .getPublicUrl(filePath);

      onUploadComplete({
        url: publicUrl,
        mediaType: isVideo ? "video" : "audio",
        fileSize: fileToUpload.size,
      });
    } catch (error) {
      onError(error instanceof Error ? error.message : "Erreur lors de l'upload");
    } finally {
      uploadRef.current = null;
      setPhase("idle");
      setProgress(0);
      setStatusMessage("");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    if (disabled || busy) return;

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
      onClick={() => !disabled && !busy && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*,audio/*"
        onChange={handleChange}
        disabled={disabled || busy}
        className="hidden"
      />

      <div className="p-8 text-center">
        {busy ? (
          <div className="space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              {phase === "compressing" ? (
                <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              ) : (
                <svg className="h-6 w-6 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              )}
            </div>
            <div>
              <p className="font-medium">
                {phase === "compressing" ? "Compression de la vidéo..." : "Upload en cours..."}
              </p>
              <p className="text-sm text-muted-foreground">{statusMessage}</p>
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
              ou clique pour sélectionner (max 500 Mo)
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              MP4, WebM, MOV, MP3, WAV
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Les vidéos de plus de 50 Mo seront compressées automatiquement
            </p>
          </>
        )}
      </div>
    </div>
  );
}
