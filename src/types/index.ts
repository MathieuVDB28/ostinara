// Types pour les morceaux
export type SongDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type SongStatus = 'want_to_learn' | 'learning' | 'mastered';

export interface Song {
  id: string;
  user_id: string;
  title: string;
  artist: string;
  album?: string;
  cover_url?: string;
  spotify_id?: string;
  preview_url?: string;
  difficulty?: SongDifficulty;
  status: SongStatus;
  progress_percent: number;
  tuning: string;
  capo_position: number;
  tabs_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSongInput {
  title: string;
  artist: string;
  album?: string;
  cover_url?: string;
  spotify_id?: string;
  preview_url?: string;
  difficulty?: SongDifficulty;
  status?: SongStatus;
  tuning?: string;
  capo_position?: number;
  tabs_url?: string;
  notes?: string;
}

export interface UpdateSongInput {
  title?: string;
  artist?: string;
  album?: string;
  cover_url?: string;
  difficulty?: SongDifficulty;
  status?: SongStatus;
  progress_percent?: number;
  tuning?: string;
  capo_position?: number;
  tabs_url?: string;
  notes?: string;
}

// Types Spotify
export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; width: number; height: number }[];
  };
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifySearchResult {
  tracks: {
    items: SpotifyTrack[];
    total: number;
  };
}

// Types pour le profil
export type UserPlan = 'free' | 'pro' | 'band';

export interface Profile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  plan: UserPlan;
  created_at: string;
}
