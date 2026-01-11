"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile, updateProfile, setFavoriteSong, setFavoriteAlbum, removeFavoriteSong, removeFavoriteAlbum, uploadAvatar } from "@/lib/actions/profile";
import { createSong } from "@/lib/actions/songs";
import type { UserProfile, UpdateProfileInput, Song } from "@/types";
import { FavoritesGrid } from "@/components/profile/favorites-grid";
import { FavoriteSelectorModal } from "@/components/profile/favorite-selector-modal";
import { SubscriptionStatusBadge } from "@/components/subscription";
import { PLANS } from "@/lib/stripe/config";
import Link from "next/link";

type Tab = "profile" | "favorites" | "privacy" | "subscription";

export default function EditProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // États du formulaire
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  // États pour modal de sélection
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectorType, setSelectorType] = useState<"song" | "album">("song");
  const [selectedPosition, setSelectedPosition] = useState<number>(1);

  // États pour avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Charger le profil
  useEffect(() => {
    getMyProfile().then((data) => {
      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || "");
        setBio(data.bio || "");
        setInstagramUrl(data.instagram_url || "");
        setTiktokUrl(data.tiktok_url || "");
        setTwitterUrl(data.twitter_url || "");
        setFacebookUrl(data.facebook_url || "");
        setIsPrivate(data.is_private);
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setError(null);
    setSaving(true);

    const input: UpdateProfileInput = {
      display_name: displayName,
      bio: bio || undefined,
      instagram_url: instagramUrl || undefined,
      tiktok_url: tiktokUrl || undefined,
      twitter_url: twitterUrl || undefined,
      facebook_url: facebookUrl || undefined,
      is_private: isPrivate,
    };

    const result = await updateProfile(input);

    if (result.error) {
      setError(result.error);
      setSaving(false);
    } else {
      // Rediriger vers le profil
      router.push("/library"); // ou "/" selon où tu veux rediriger
    }
  };

  // Gestion des favoris - Morceaux
  const handleAddFavoriteSong = (position: number) => {
    setSelectedPosition(position);
    setSelectorType("song");
    setIsSelectorOpen(true);
  };

  const handleSelectSong = async (song: Song) => {
    let songId = song.id;

    // Si le morceau n'a pas de user_id, c'est un morceau Spotify qui n'est pas encore dans la bibliothèque
    if (!song.user_id) {
      // Créer d'abord le morceau dans la bibliothèque
      const createResult = await createSong({
        title: song.title,
        artist: song.artist,
        album: song.album,
        cover_url: song.cover_url,
        spotify_id: song.spotify_id,
        preview_url: song.preview_url,
        status: "want_to_learn",
      });

      if (!createResult.success || !createResult.song) {
        setError(createResult.error || "Erreur lors de l'ajout du morceau à la bibliothèque");
        return;
      }

      songId = createResult.song.id;
    }

    // Ajouter le morceau comme favori
    const result = await setFavoriteSong({ song_id: songId, position: selectedPosition });
    if (result.success) {
      // Recharger le profil
      const updatedProfile = await getMyProfile();
      if (updatedProfile) setProfile(updatedProfile);
    } else {
      setError(result.error || "Erreur lors de l'ajout du morceau favori");
    }
  };

  const handleRemoveFavoriteSong = async (position: number) => {
    const result = await removeFavoriteSong(position);
    if (result.success) {
      const updatedProfile = await getMyProfile();
      if (updatedProfile) setProfile(updatedProfile);
    }
  };

  const handleReorderFavoriteSongs = async (fromPosition: number, toPosition: number) => {
    if (!profile) return;

    const fromItem = profile.favorite_songs.find(s => s.position === fromPosition);
    const toItem = profile.favorite_songs.find(s => s.position === toPosition);

    if (fromItem) {
      await setFavoriteSong({ song_id: fromItem.song_id, position: toPosition });
    }
    if (toItem) {
      await setFavoriteSong({ song_id: toItem.song_id, position: fromPosition });
    }

    // Recharger le profil
    const updatedProfile = await getMyProfile();
    if (updatedProfile) setProfile(updatedProfile);
  };

  // Gestion des favoris - Albums
  const handleAddFavoriteAlbum = (position: number) => {
    setSelectedPosition(position);
    setSelectorType("album");
    setIsSelectorOpen(true);
  };

  const handleSelectAlbum = async (album: { album_name: string; artist_name: string; cover_url?: string; spotify_id?: string }) => {
    const result = await setFavoriteAlbum({ ...album, position: selectedPosition });
    if (result.success) {
      const updatedProfile = await getMyProfile();
      if (updatedProfile) setProfile(updatedProfile);
    }
  };

  const handleRemoveFavoriteAlbum = async (position: number) => {
    const result = await removeFavoriteAlbum(position);
    if (result.success) {
      const updatedProfile = await getMyProfile();
      if (updatedProfile) setProfile(updatedProfile);
    }
  };

  const handleReorderFavoriteAlbums = async (fromPosition: number, toPosition: number) => {
    if (!profile) return;

    const fromItem = profile.favorite_albums.find(a => a.position === fromPosition);
    const toItem = profile.favorite_albums.find(a => a.position === toPosition);

    if (fromItem) {
      await setFavoriteAlbum({
        album_name: fromItem.album_name,
        artist_name: fromItem.artist_name,
        cover_url: fromItem.cover_url,
        spotify_id: fromItem.spotify_id,
        position: toPosition,
      });
    }
    if (toItem) {
      await setFavoriteAlbum({
        album_name: toItem.album_name,
        artist_name: toItem.artist_name,
        cover_url: toItem.cover_url,
        spotify_id: toItem.spotify_id,
        position: fromPosition,
      });
    }

    // Recharger le profil
    const updatedProfile = await getMyProfile();
    if (updatedProfile) setProfile(updatedProfile);
  };

  // Gestion de l'avatar
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Créer un aperçu
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload immédiatement
      handleAvatarUpload(file);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append("avatar", file);

    const result = await uploadAvatar(formData);

    if (result.success) {
      // Recharger le profil pour mettre à jour l'avatar
      const updatedProfile = await getMyProfile();
      if (updatedProfile) {
        setProfile(updatedProfile);
        setAvatarPreview(null); // Reset preview car l'avatar est maintenant dans le profil
      }
    } else {
      setError(result.error || "Erreur lors de l'upload de l'avatar");
    }
    setUploadingAvatar(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Erreur lors du chargement du profil</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Éditer le profil</h1>
        <p className="text-muted-foreground">Personnalise ton profil et choisis tes favoris</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-border">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("profile")}
            className={`relative pb-3 text-sm font-medium transition-colors ${
              activeTab === "profile"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Profil
            {activeTab === "profile" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("favorites")}
            className={`relative pb-3 text-sm font-medium transition-colors ${
              activeTab === "favorites"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Favoris
            {activeTab === "favorites" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("privacy")}
            className={`relative pb-3 text-sm font-medium transition-colors ${
              activeTab === "privacy"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Confidentialité
            {activeTab === "privacy" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("subscription")}
            className={`relative pb-3 text-sm font-medium transition-colors ${
              activeTab === "subscription"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Abonnement
            {activeTab === "subscription" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mb-6">
        {/* Tab Profil */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-3xl font-bold text-primary">
                  {avatarPreview || profile.avatar_url ? (
                    <img
                      src={avatarPreview || profile.avatar_url || ""}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    profile.display_name?.[0]?.toUpperCase() || profile.username[0].toUpperCase()
                  )}
                </div>
                {uploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/80">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="mb-1 font-medium">Photo de profil</h3>
                <p className="mb-3 text-sm text-muted-foreground">
                  JPG, PNG ou GIF. Max 2MB.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {uploadingAvatar ? "Upload..." : "Changer la photo"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nom d&apos;affichage</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ton nom d'affichage"
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Bio</label>
                <span className={`text-xs ${bio.length > 160 ? "text-destructive" : "text-muted-foreground"}`}>
                  {bio.length}/160
                </span>
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                placeholder="Parle-nous de toi..."
                rows={3}
                className="w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground">
                Max 160 caractères
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Liens sociaux</h3>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  Instagram
                </label>
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/ton_compte"
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                  TikTok
                </label>
                <input
                  type="url"
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  placeholder="https://tiktok.com/@ton_compte"
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                  Twitter
                </label>
                <input
                  type="url"
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                  placeholder="https://twitter.com/ton_compte"
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </label>
                <input
                  type="url"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/ton_compte"
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab Favoris */}
        {activeTab === "favorites" && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-lg font-semibold">Morceaux favoris</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Sélectionne jusqu&apos;à 4 morceaux qui te représentent. Clique sur + pour ajouter, glisse pour réorganiser.
              </p>
              <FavoritesGrid
                items={profile.favorite_songs}
                mode="edit"
                type="songs"
                onAdd={handleAddFavoriteSong}
                onRemove={handleRemoveFavoriteSong}
                onReorder={handleReorderFavoriteSongs}
              />
            </div>

            <div>
              <h3 className="mb-3 text-lg font-semibold">Albums favoris</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Choisis jusqu&apos;à 4 albums cultes. Recherche sur Spotify pour trouver tes albums préférés.
              </p>
              <FavoritesGrid
                items={profile.favorite_albums}
                mode="edit"
                type="albums"
                onAdd={handleAddFavoriteAlbum}
                onRemove={handleRemoveFavoriteAlbum}
                onReorder={handleReorderFavoriteAlbums}
              />
            </div>
          </div>
        )}

        {/* Tab Confidentialité */}
        {activeTab === "privacy" && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-4 text-lg font-semibold">Visibilité du compte</h3>
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      {isPrivate ? (
                        <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      <h4 className="font-medium">
                        {isPrivate ? "Compte privé" : "Compte public"}
                      </h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isPrivate
                        ? "Seuls tes amis peuvent voir tes morceaux, favoris et bio. Ton nom et ton avatar restent visibles par tous."
                        : "Tout le monde peut voir ton profil complet, y compris tes morceaux et favoris."
                      }
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPrivate(!isPrivate)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      isPrivate ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isPrivate ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="mb-2 font-medium">Ce que les autres voient :</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Ton avatar, nom et nom d&apos;utilisateur
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Ton badge de plan (Free/Pro/Band)
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Tes statistiques (nombre de morceaux, covers)
                </li>
                {isPrivate ? (
                  <>
                    <li className="flex items-start gap-2">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Ta bio et tes liens sociaux <span className="text-primary">(amis uniquement)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Tes morceaux et favoris <span className="text-primary">(amis uniquement)</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-2">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Ta bio et tes liens sociaux
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Tes morceaux et favoris
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Tab Abonnement */}
        {activeTab === "subscription" && (
          <div className="space-y-6">
            {/* Plan actuel */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="mb-2 text-lg font-semibold">Mon plan</h3>
                  <SubscriptionStatusBadge
                    plan={profile.plan}
                    status={profile.subscription_status}
                    periodEnd={profile.subscription_period_end}
                  />
                </div>
                <Link
                  href="/account/subscription"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {profile.plan === "free" ? "Passer Pro" : "Gérer"}
                </Link>
              </div>
            </div>

            {/* Résumé du plan */}
            <div className="rounded-xl border border-border bg-card/50 p-6">
              <h3 className="mb-4 text-lg font-semibold">
                Fonctionnalités de ton plan
              </h3>
              <ul className="space-y-3">
                {PLANS[profile.plan].features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {profile.plan === "free" && (
                <div className="mt-6 rounded-lg bg-primary/10 p-4">
                  <p className="text-sm text-primary">
                    <strong>Passe Pro</strong> pour débloquer morceaux illimités,
                    covers illimités, et bien plus encore !
                  </p>
                </div>
              )}
            </div>

            {/* Comparaison des plans */}
            <div className="text-center">
              <Link
                href="/pricing"
                className="text-sm text-primary hover:underline"
              >
                Comparer tous les plans →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
        <button
          onClick={() => router.back()}
          className="rounded-lg border border-border px-6 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>

      {/* Modal de sélection de favoris */}
      <FavoriteSelectorModal
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        type={selectorType}
        onSelectSong={selectorType === "song" ? handleSelectSong : undefined}
        onSelectAlbum={selectorType === "album" ? handleSelectAlbum : undefined}
      />
    </div>
  );
}
