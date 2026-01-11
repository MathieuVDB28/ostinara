"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createJamSession, getBandSetlistsForJam } from "@/lib/actions/jam-sessions";
import type { BandWithMembers, SetlistWithDetails } from "@/types";

interface StartJamModalProps {
  isOpen: boolean;
  onClose: () => void;
  band: BandWithMembers;
}

export function StartJamModal({ isOpen, onClose, band }: StartJamModalProps) {
  const router = useRouter();
  const [selectedSetlistId, setSelectedSetlistId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingSetlists, setLoadingSetlists] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bandSetlists, setBandSetlists] = useState<SetlistWithDetails[]>([]);

  // Load band setlists when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoadingSetlists(true);
      getBandSetlistsForJam(band.id)
        .then(setBandSetlists)
        .finally(() => setLoadingSetlists(false));
    }
  }, [isOpen, band.id]);

  if (!isOpen) return null;

  const handleStart = async () => {
    setLoading(true);
    setError(null);

    const result = await createJamSession(
      band.id,
      selectedSetlistId || undefined
    );

    if (result.success && result.session) {
      router.push(`/jam/${result.session.id}`);
    } else {
      setError(result.error || "Erreur inconnue");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-2">Demarrer une Jam Session</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Lance une session collaborative avec les membres de{" "}
          <span className="font-medium text-foreground">{band.name}</span>
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Setlist selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Setlist (optionnel)
          </label>
          {loadingSetlists ? (
            <div className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
              Chargement des setlists...
            </div>
          ) : (
            <select
              value={selectedSetlistId}
              onChange={(e) => setSelectedSetlistId(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">Session libre (sans setlist)</option>
              {bandSetlists.map((setlist) => (
                <option key={setlist.id} value={setlist.id}>
                  {setlist.name} ({setlist.song_count} morceaux)
                </option>
              ))}
            </select>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Choisir une setlist permet de naviguer les morceaux ensemble
          </p>
        </div>

        {/* Members preview */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">
            Les membres suivants seront notifies :
          </p>
          <div className="flex -space-x-2">
            {band.members
              .filter((m) => m.user_id !== band.owner_id)
              .slice(0, 5)
              .map((member) => (
                <div
                  key={member.id}
                  className="h-8 w-8 rounded-full border-2 border-card bg-primary/20 flex items-center justify-center text-xs font-medium text-primary overflow-hidden"
                  title={member.profile.display_name || member.profile.username}
                >
                  {member.profile.avatar_url ? (
                    <img
                      src={member.profile.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (
                      member.profile.display_name?.[0] ||
                      member.profile.username[0]
                    ).toUpperCase()
                  )}
                </div>
              ))}
            {band.members.filter((m) => m.user_id !== band.owner_id).length >
              5 && (
              <div className="h-8 w-8 rounded-full border-2 border-card bg-accent flex items-center justify-center text-xs font-medium">
                +
                {band.members.filter((m) => m.user_id !== band.owner_id).length -
                  5}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-border py-2.5 font-medium transition-colors hover:bg-accent disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleStart}
            disabled={loading || loadingSetlists}
            className="flex-1 rounded-lg bg-primary py-2.5 font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Demarrage..." : "Demarrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
